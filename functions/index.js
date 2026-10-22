// File: functions/index.js
const functions = require("firebase-functions/v1");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const crypto = require("crypto");
const axios = require("axios");

const { sendWhatsApp } = require("./whatsappService");

const { defineSecret } = require("firebase-functions/params");
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");
const TWILIO_MESSAGING_SERVICE_SID = defineSecret("TWILIO_MESSAGING_SERVICE_SID");
const JUSPAY_MERCHANT_PRIVATE_KEY = defineSecret("JUSPAY_MERCHANT_PRIVATE_KEY");
const JUSPAY_PUBLIC_KEY = defineSecret("JUSPAY_PUBLIC_KEY");

admin.initializeApp();

let _expo = null;
const getExpo = () => {
  if (!_expo) {
    const { Expo } = require("expo-server-sdk");
    _expo = new Expo();
  }
  return _expo;
};

let _cashfree = null;
const getCashfree = () => {
  if (!_cashfree) {
    const { Cashfree } = require("cashfree-pg");
    _cashfree = Cashfree;
  }
  return _cashfree;
};

// ===========================================================================
// DBS ENDPOINT CONFIGURATION
// ===========================================================================
const JUSPAY_BASE_URL =
  process.env.JUSPAY_BASE_URL ||
  (process.env.JUSPAY_API_URL
    ? process.env.JUSPAY_API_URL.replace(/\/session\/?$/, "")
    : null);

if (!JUSPAY_BASE_URL) {
  console.warn(
    "[DBS] Neither JUSPAY_BASE_URL nor JUSPAY_API_URL is set. Payment functions will fail."
  );
}

const getDbsSessionUrl = () => {
  if (!JUSPAY_BASE_URL) {
    throw new Error(
      "JUSPAY_BASE_URL (or JUSPAY_API_URL) must be configured in the environment."
    );
  }
  return `${JUSPAY_BASE_URL}/session`;
};

const getDbsOrderStatusBaseUrl = () => {
  if (!JUSPAY_BASE_URL) {
    throw new Error("JUSPAY_BASE_URL must be configured in the environment.");
  }
  return JUSPAY_BASE_URL;
};

const getJuspayMandateEndpoint = (mandateId) =>
  `${getDbsOrderStatusBaseUrl()}/mandates/${encodeURIComponent(mandateId)}`;

const getJuspayCustomerMandatesEndpoint = (customerId) =>
  `${getDbsOrderStatusBaseUrl()}/customers/${encodeURIComponent(customerId)}/mandates`;

const getJuspayOffersEndpoint = (params = {}) => {
  const url = new URL(`${getDbsOrderStatusBaseUrl()}/offers`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.append(key, String(value));
  });
  return url.toString();
};

const JUSPAY_SUBSCRIPTION_PLANS = {
  basic: { amount: 1999, tier: "BASIC", durationDays: 30 },
  premium_growth: { amount: 4999, tier: "GROWTH_PACKAGE", durationDays: 30 },
  standard: { amount: 4999, tier: "GROWTH_PACKAGE", durationDays: 30 },
  growth: { amount: 49999, tier: "GROWTH_PACKAGE", durationDays: 365 },
};

// ===========================================================================
// MANDATE CONFIGURATION
// ===========================================================================
const MANDATE_STATUS = {
  CREATED: "CREATED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  REVOKED: "REVOKED",
  FAILURE: "FAILURE",
  EXPIRED: "EXPIRED",
};

const MANDATE_WEBHOOK_TO_STATUS = {
  MANDATE_CREATED: MANDATE_STATUS.CREATED,
  MANDATE_ACTIVATED: MANDATE_STATUS.ACTIVE,
  MANDATE_FAILED: MANDATE_STATUS.FAILURE,
  MANDATE_REVOKED: MANDATE_STATUS.REVOKED,
  MANDATE_PAUSED: MANDATE_STATUS.PAUSED,
  MANDATE_EXPIRED: MANDATE_STATUS.EXPIRED,
};

const MANDATE_AMOUNT_RULE = {
  VARIABLE: "VARIABLE",
  FIXED: "FIXED",
};

const MANDATE_FREQUENCIES = [
  "ONETIME", "DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY",
  "BIMONTHLY", "QUARTERLY", "HALFYEARLY", "YEARLY", "ASPRESENTED",
];

const FREQUENCIES_REQUIRING_RULE_VALUE = [
  "WEEKLY", "FORTNIGHTLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "HALFYEARLY", "YEARLY",
];

function defaultRuleValue(frequency) {
  if (frequency === "WEEKLY") return 1;
  if (frequency === "FORTNIGHTLY") return 1;
  if (["MONTHLY", "BIMONTHLY", "QUARTERLY", "HALFYEARLY", "YEARLY"].includes(frequency)) {
    return 1;
  }
  return null;
}

function todayUtcMidnightEpoch() {
  const now = new Date();
  return Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000
  );
}

function computeNextDebitAt(frequency, ruleValue, ruleType, from = new Date()) {
  const freq = (frequency || "MONTHLY").toUpperCase();
  const rt = (ruleType || "AFTER").toUpperCase();
  const rv = Number(ruleValue) || 1;
  const next = new Date(from.getTime());

  if (freq === "DAILY") {
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }
  if (freq === "WEEKLY") {
    const targetDay = Math.min(Math.max(rv, 1), 7);
    const jsTarget = targetDay === 7 ? 0 : targetDay;
    const currentDay = next.getUTCDay();
    let daysAhead = (jsTarget - currentDay + 7) % 7;
    if (daysAhead === 0) daysAhead = 7;
    next.setUTCDate(next.getUTCDate() + daysAhead);
    return next;
  }
  if (freq === "FORTNIGHTLY") {
    next.setUTCDate(next.getUTCDate() + 14);
    return next;
  }
  if (["MONTHLY", "BIMONTHLY", "QUARTERLY", "HALFYEARLY", "YEARLY"].includes(freq)) {
    const monthStep =
      freq === "MONTHLY" ? 1
      : freq === "BIMONTHLY" ? 2
      : freq === "QUARTERLY" ? 3
      : freq === "HALFYEARLY" ? 6
      : 12;
    next.setUTCMonth(next.getUTCMonth() + monthStep);
    const year = next.getUTCFullYear();
    const month = next.getUTCMonth();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(Math.max(rv, 1), lastDay));
    return next;
  }
  next.setUTCDate(next.getUTCDate() + 30);
  return next;
}

// ===========================================================================
// Auth + retry + structured error parsing
// ===========================================================================
const getDbsAuthHeader = () =>
  `Basic ${Buffer.from(`${process.env.JUSPAY_API_KEY}:`).toString("base64")}`;

const RETRYABLE_STATUSES = [500, 502, 504];
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

async function retryWithBackoff(fn, label = "DBS") {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const isRetryable = RETRYABLE_STATUSES.includes(status);
      if (!isRetryable || attempt === MAX_RETRIES) throw error;
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(`[${label}] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms (HTTP ${status})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

const SESSION_ERROR_INFO = {
  MISSING_PARAMETER: { message: "A required field is missing from the payment request.", retryable: false, userAction: "fix_request" },
  DUPLICATE_ORDER_ID: { message: "This order was already submitted. Please start a new order.", retryable: false, userAction: "new_order_id" },
  UNAUTHORIZED: { message: "Payment gateway authentication failed. Contact support.", retryable: false, userAction: "contact_support" },
  BAD_ORIGIN: { message: "Server is not authorised to reach the payment gateway.", retryable: false, userAction: "contact_support" },
  RESOURCE_NOT_FOUND: { message: "Merchant configuration is invalid. Contact support.", retryable: false, userAction: "contact_support" },
  UNSUPPORTED_MEDIA_TYPE: { message: "Internal configuration error. Contact support.", retryable: false, userAction: "contact_support" },
  INVALID_FORMAT: { message: "Invalid field format in payment request.", retryable: false, userAction: "fix_request" },
  INTERNAL_SERVER_ERROR: { message: "Payment gateway is temporarily unavailable. Please retry.", retryable: true, userAction: "retry" },
  GATEWAY_ERROR: { message: "Payment gateway had a temporary issue. Please retry.", retryable: true, userAction: "retry" },
  GATEWAY_TIMEOUT: { message: "Payment gateway timed out. Please retry.", retryable: true, userAction: "retry" },
  INVALID_INPUT: { message: "Payment gateway rejected the request. Check the amount and try again.", retryable: false, userAction: "contact_support" },
  INVALID_REQUEST: { message: "Payment gateway rejected the request. Check the amount and try again.", retryable: false, userAction: "contact_support" },
  MANDATE_NOT_ALLOWED: { message: "Mandate registration is not enabled for this merchant. Contact DBS support.", retryable: false, userAction: "contact_support" },
  MANDATE_MERCHANT_NOT_ENABLED: { message: "Auto-pay is not enabled on your merchant account. Contact support.", retryable: false, userAction: "contact_support" },
  MANDATE_INVALID_FREQUENCY: { message: "Invalid mandate frequency. Please try a different plan.", retryable: false, userAction: "contact_support" },
  MANDATE_INVALID_RULE_VALUE: { message: "Invalid mandate rule value. Please try a different plan.", retryable: false, userAction: "contact_support" },
  MANDATE_INVALID_MAX_AMOUNT: { message: "Invalid mandate max amount. Please try a different plan.", retryable: false, userAction: "contact_support" },
  MANDATE_CREATION_FAILED: { message: "Could not set up auto-pay. Please try again or use one-time payment.", retryable: true, userAction: "retry" },
  MANDATE_NOT_SUPPORTED: { message: "Auto-pay is not supported for this payment method. Try one-time payment.", retryable: false, userAction: "contact_support" },
  PG_NOT_SUPPORTED: { message: "Payment gateway does not support this mandate configuration.", retryable: false, userAction: "contact_support" },
};

function parseDbsError(error) {
  const resp = error.response;
  if (!resp) {
    return {
      httpStatus: null,
      errorCode: "NETWORK_ERROR",
      subCode: null,
      message: error.message || "Network error reaching payment gateway.",
      retryable: true,
      userAction: "retry",
      raw: null,
    };
  }

  const body = resp.data || {};
  const outerErrorCode = body.error_code || body.errorCode || body.code || null;
  const errorInfo = body.error_info || {};
  const innerErrorCode = errorInfo.code || null;
  const innerFields = Array.isArray(errorInfo.fields) ? errorInfo.fields : [];

  const fieldReasons = innerFields
    .map((f) => {
      const name = f.field_name || f.name || f.field || "field";
      const reason = f.reason || f.message || f.code || null;
      return reason ? `${name}: ${reason}` : null;
    })
    .filter(Boolean);

  const dbsMessage =
    fieldReasons.length > 0
      ? fieldReasons.join(" | ")
      : errorInfo.user_message ||
        errorInfo.developer_message ||
        body.message || body.error || body.error_description || body.description || null;

  const key = innerErrorCode || outerErrorCode;
  const info = SESSION_ERROR_INFO[key] || {
    message: dbsMessage || "Payment gateway returned an unexpected error.",
    retryable: RETRYABLE_STATUSES.includes(resp.status),
    userAction: RETRYABLE_STATUSES.includes(resp.status) ? "retry" : "contact_support",
  };

  return {
    httpStatus: resp.status,
    errorCode: outerErrorCode || `HTTP_${resp.status}`,
    subCode: innerErrorCode,
    message: dbsMessage || info.message,
    retryable: info.retryable,
    userAction: info.userAction,
    raw: body,
  };
}

// ===========================================================================
// Persist a mandate block from Order Status API or webhooks
// ===========================================================================
async function saveMandateFromPayload(mandateBlock, extra = {}) {
  if (!mandateBlock || !mandateBlock.mandate_id) return null;

  const mandateId = String(mandateBlock.mandate_id);
  const frequency = String(mandateBlock.frequency || "MONTHLY").toUpperCase();
  const ruleValue =
    mandateBlock.rule_value !== undefined && mandateBlock.rule_value !== null
      ? Number(mandateBlock.rule_value)
      : null;
  const ruleType = mandateBlock.rule_type
    ? String(mandateBlock.rule_type).toUpperCase()
    : "AFTER";

  const nextDebitAt = computeNextDebitAt(frequency, ruleValue, ruleType);

  // ─────────────────────────────────────────────────────────────
  // ✅ eNACH: capture bank_details block (account_number, ifsc, etc.)
  //    Present only for eNACH mandates per DBS spec.
  // ─────────────────────────────────────────────────────────────
  const bankDetails = mandateBlock.bank_details || null;

  // ─────────────────────────────────────────────────────────────
  // ✅ TPV: capture bank_account_details / gateway_response block
  //    Present when mandate is TPV_PAYMENT (UPI/NB only).
  // ─────────────────────────────────────────────────────────────
  const tpvDetails = mandateBlock.tpv_details || null;
  const gatewayResponse = mandateBlock.gateway_response || null;

  const mandateData = {
    mandateId,
    status: String(mandateBlock.mandate_status || mandateBlock.status || "CREATED").toUpperCase(),
    mandateToken: mandateBlock.mandate_token || null,
    mandateType: mandateBlock.mandate_type || null,
    startDate: mandateBlock.start_date || null,
    endDate: mandateBlock.end_date || null,
    frequency,
    ruleValue,
    ruleType,
    nextDebitAt,
    amountRule: mandateBlock.amount_rule || "VARIABLE",
    maxAmount:
      mandateBlock.max_amount !== undefined && mandateBlock.max_amount !== null
        ? Number(mandateBlock.max_amount)
        : null,
    revokableByCustomer:
      mandateBlock.revokable_by_customer !== undefined ? mandateBlock.revokable_by_customer : null,
    blockFund: mandateBlock.block_fund !== undefined ? mandateBlock.block_fund : null,

    // ✅ NEW: eNACH-specific
    ...(bankDetails
      ? {
          bankDetails: {
            accountNumber: bankDetails.account_number || null,
            ifsc: bankDetails.ifsc || null,
            bankName: bankDetails.bank_name || null,
            bankAccountType: bankDetails.bank_account_type || null,
            beneficiaryName: bankDetails.beneficiary_name || null,
          },
        }
      : {}),

    // ✅ NEW: TPV-specific
    ...(tpvDetails
      ? {
          tpvDetails: {
            tpvValidationStatus: tpvDetails.tpvValidationStatus || null,
            payerVpa: tpvDetails.payerVpa || null,
            payeeVpa: tpvDetails.payeeVpa || null,
            umn: tpvDetails.umn || null,
          },
        }
      : {}),

    // ✅ NEW: Gateway response (present for TPV)
    ...(gatewayResponse
      ? { gatewayResponseBlock: gatewayResponse }
      : {}),

    rawMandate: mandateBlock,
    lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...extra,
  };

  await admin.firestore().collection("mandates").doc(mandateId).set(mandateData, { merge: true });

  console.log(`[DBS] Mandate persisted: ${mandateId}`, {
    status: mandateData.status,
    frequency: mandateData.frequency,
    ruleValue: mandateData.ruleValue,
    ruleType: mandateData.ruleType,
    maxAmount: mandateData.maxAmount,
    hasBankDetails: !!bankDetails,
    hasTpvDetails: !!tpvDetails,
  });

  return mandateData;
}

// ===========================================================================
// Idempotent order fulfillment
// ===========================================================================
const markJuspayOrderCharged = async (
  orderId, transactionId, chargedAmount, currency, mandateBlock = null
) => {
  const db = admin.firestore();
  const sessionRef = db.collection("juspaySessions").doc(String(orderId));

  const result = await db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) return null;

    const session = sessionSnapshot.data();
    if (session.status === "CHARGED") return session;

    const expectedAmount = Number(session.amount);
    const actualAmount = Number(chargedAmount);
    if (
      !Number.isFinite(actualAmount) ||
      Math.round(expectedAmount * 100) !== Math.round(actualAmount * 100)
    ) {
      throw new Error("Verified DBS charge amount does not match the stored order amount.");
    }
    if (String(currency || "").toUpperCase() !== "INR") {
      throw new Error("Verified DBS charge currency is not INR.");
    }

    let userRef, userSnapshot, orderRef, orderSnapshot;
    const isSubscription =
      session.type === "subscription" || session.type === "subscription_autopay";

    if (isSubscription) {
      userRef = db.collection("users").doc(session.userId);
      userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists || !session.planTier || !session.subscriptionDurationDays) {
        throw new Error("Subscription payment session is missing its user or plan details.");
      }
    } else if (session.type === "product") {
      orderRef = db.collection("orders").doc(session.referenceId);
      orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) {
        throw new Error("Product payment session is missing its order document.");
      }
    } else {
      throw new Error("Unsupported DBS payment session type.");
    }

    const paidAt = new Date();
    const subscriptionExpiry =
      isSubscription && session.subscriptionDurationDays
        ? new Date(paidAt.getTime() + session.subscriptionDurationDays * 86400000).toISOString()
        : null;

    transaction.update(sessionRef, {
      status: "CHARGED",
      transactionId: transactionId || null,
      ...(subscriptionExpiry ? { subscriptionExpiry } : {}),
      ...(mandateBlock?.mandate_id
        ? {
            mandateId: String(mandateBlock.mandate_id),
            mandateStatus: String(mandateBlock.mandate_status || "ACTIVE").toUpperCase(),
            mandatePending: false,
            mandateActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }
        : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (isSubscription) {
      transaction.update(userRef, {
        subscriptionTier: session.planTier,
        subscriptionPlan: session.referenceId,
        subscriptionExpiry,
        subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(session.type === "subscription_autopay"
          ? { autoRenewEnabled: true }
          : { autoRenewEnabled: false }),
      });
    } else if (session.type === "product") {
      transaction.update(orderRef, {
        status: "PENDING_SELLER",
        paymentStatus: "completed",
        paymentDetails: {
          provider: "DBS_HYPERCHECKOUT",
          juspayOrderId: String(orderId),
          transactionId: transactionId || null,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }

    return {
      ...session,
      status: "CHARGED",
      ...(subscriptionExpiry ? { subscriptionExpiry } : {}),
    };
  });

  if (mandateBlock?.mandate_id && result) {
    try {
      await saveMandateFromPayload(mandateBlock, {
        customerId: result.userId || null,
        orderId: String(orderId),
        planKey: result.referenceId || null,
        planTier: result.planTier || null,
        subscriptionDurationDays: result.subscriptionDurationDays || null,
      });
    } catch (err) {
      console.error("[DBS] Failed to persist mandate block:", err.message);
    }
  }

  return result;
};

// ---------------------------------------------------------------------------
// JWE / JWS decrypt+verify
// ---------------------------------------------------------------------------
const base64UrlToBuffer = (value) => Buffer.from(value, "base64url");

const decryptAndVerifyJuspayStatus = (encryptedResponse, merchantPrivateKeyPem, juspayPublicKeyPem) => {
  const token =
    typeof encryptedResponse === "string"
      ? encryptedResponse
      : encryptedResponse?.header &&
        encryptedResponse?.encryptedKey &&
        encryptedResponse?.iv &&
        encryptedResponse?.encryptedPayload &&
        encryptedResponse?.tag
      ? [
          encryptedResponse.header, encryptedResponse.encryptedKey,
          encryptedResponse.iv, encryptedResponse.encryptedPayload, encryptedResponse.tag,
        ].join(".")
      : null;
  if (!token) throw new Error("DBS status response did not contain a supported encrypted payload.");

  const jweParts = token.split(".");
  if (jweParts.length !== 5) throw new Error("DBS status JWE is malformed.");
  const [protectedHeader, encryptedKey, iv, encryptedPayload, authTag] = jweParts;
  const header = JSON.parse(base64UrlToBuffer(protectedHeader).toString("utf8"));
  if (!["RSA-OAEP", "RSA-OAEP-256"].includes(header.alg) || header.enc !== "A256GCM") {
    throw new Error("DBS status JWE uses an unsupported encryption algorithm.");
  }

  const cek = crypto.privateDecrypt(
    {
      key: crypto.createPrivateKey(merchantPrivateKeyPem),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    base64UrlToBuffer(encryptedKey)
  );
  const decipher = crypto.createDecipheriv("aes-256-gcm", cek, base64UrlToBuffer(iv));
  decipher.setAAD(Buffer.from(protectedHeader));
  decipher.setAuthTag(base64UrlToBuffer(authTag));
  const signedToken = Buffer.concat([
    decipher.update(base64UrlToBuffer(encryptedPayload)),
    decipher.final(),
  ]).toString("utf8");

  const jwsParts = signedToken.split(".");
  if (jwsParts.length !== 3) throw new Error("DBS status JWS is malformed.");
  const [signedHeader, signedPayload, signature] = jwsParts;
  const jwsHeader = JSON.parse(base64UrlToBuffer(signedHeader).toString("utf8"));
  if (jwsHeader.alg !== "RS256") throw new Error("DBS status JWS uses an unsupported signing algorithm.");
  const valid = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${signedHeader}.${signedPayload}`),
    crypto.createPublicKey(juspayPublicKeyPem),
    base64UrlToBuffer(signature)
  );
  if (!valid) throw new Error("DBS status signature verification failed.");

  return JSON.parse(base64UrlToBuffer(signedPayload).toString("utf8"));
};

const readJuspayEncryptedResponse = async (response) => {
  const responseText = await response.text();
  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
};

// ==========================================
// 🚀 PUSH NOTIFICATION TRIGGER
// ==========================================
exports.sendPushNotification = onDocumentCreated(
  { document: "notifications/{docId}", region: "asia-south1" },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;
    const notificationData = snap.data();
    const { title, message, userId } = notificationData;
    const expo = getExpo();
    let tokens = [];
    try {
      if (userId === "ALL") {
        const usersSnap = await admin.firestore().collection("users").get();
        usersSnap.forEach((doc) => {
          const token = doc.data().expoPushToken;
          if (token && expo.constructor.isExpoPushToken
            ? expo.constructor.isExpoPushToken(token)
            : require("expo-server-sdk").Expo.isExpoPushToken(token)) {
            tokens.push(token);
          }
        });
      } else {
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        if (userDoc.exists) {
          const token = userDoc.data().expoPushToken;
          const { Expo } = require("expo-server-sdk");
          if (token && Expo.isExpoPushToken(token)) tokens.push(token);
        }
      }
      if (tokens.length === 0) return null;
      let messages = tokens.map((pushToken) => ({
        to: pushToken, sound: "default",
        title: title || "New Notification", body: message || "You have a new message.",
        data: { customData: "prochem_data" },
      }));
      let chunks = expo.chunkPushNotifications(messages);
      let tickets = [];
      for (let chunk of chunks) {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }
      return tickets;
    } catch (error) {
      console.error("Error sending push notification:", error);
      return null;
    }
  }
);

// ==========================================
// 🚀 UTILITY-BASED BROADCAST
// ==========================================
exports.onRequirementCreated = onDocumentCreated(
  {
    document: "customRequirements/{docId}",
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_MESSAGING_SERVICE_SID],
    timeoutSeconds: 300,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;
    const reqData = snap.data();
    const docId = event.params.docId;
    const buyerId = reqData.buyerId;
    const productName = reqData.productName || "Product";
    const quantity = reqData.quantity || "";
    const unit = reqData.unit || "";
    const targetPrice = reqData.targetPrice;
    try {
      const usersSnap = await admin.firestore().collection("users").get();
      const displayPrice = targetPrice ? `₹${targetPrice}` : "Negotiable";
      const displayQty = `${quantity} ${unit}`.trim() || "Check App";
      const msg = `🔔 *New Buyer Requirement on Prochem*\n\n🧪 *Product:* ${productName}\n📦 *Quantity:* ${displayQty}\n💰 *Target Price:* ${displayPrice}\n🔢 *Requirement ID:* #${docId}\n\nPlease open the Prochem app to view full details and submit your quotation.`;
      const usersToAlert = [];
      let debugLog = `Requirement #${docId} Evaluation Report:\n`;
      usersSnap.forEach((doc) => {
        const userData = doc.data();
        const userId = doc.id;
        const userPhone = userData.phoneNumber || userData.phone;
        const isExcluded =
          userId === buyerId ||
          (reqData.excludedSellerIds && reqData.excludedSellerIds.includes(userId)) ||
          userId === reqData.excludedSellerId;
        const prefs = userData.whatsappPreferences || {};
        const wantsMarketAlerts = prefs.marketAlerts !== false;
        const hasOptIn = userData.whatsappOptIn !== false;
        const hasPhone = !!userPhone;
        if (userId === buyerId) debugLog += `- Skipped ${userPhone || userId}: This is the buyer.\n`;
        else if (!hasPhone) debugLog += `- Skipped ${userId}: No phone number on profile.\n`;
        else if (!hasOptIn) debugLog += `- Skipped ${userPhone}: Opted out of WhatsApp.\n`;
        else if (!wantsMarketAlerts) debugLog += `- Skipped ${userPhone}: Market alerts disabled.\n`;
        else if (isExcluded) debugLog += `- Skipped ${userPhone}: Excluded.\n`;
        else {
          usersToAlert.push({ userId, phoneNumber: userPhone });
          debugLog += `✅ ADDED ${userPhone}.\n`;
        }
      });
      if (usersToAlert.length === 0) {
        await admin.firestore().collection("whatsappLogs").add({
          direction: "outbound", toNumber: "SYSTEM_DIAGNOSTIC",
          body: `Broadcast Requirement #${docId} (${productName}) had 0 eligible users.\n\n${debugLog}`,
          templateName: "System_Diagnostic", messageType: "debug",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: "failed", error: "No eligible users found.",
        });
        return null;
      }
      const chunkSize = 10;
      for (let i = 0; i < usersToAlert.length; i += chunkSize) {
        const chunk = usersToAlert.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map((user) =>
            sendWhatsApp(user.phoneNumber, msg, null, {
              templateName: "prochem_requirement_utility",
              templateSid: "HX22bc4b7900f3e532683be8f71cb1a1cc",
              templateVariables: {
                "1": String(productName), "2": String(displayQty),
                "3": String(displayPrice), "4": String(docId),
              },
              type: "utility", userId: user.userId,
            }).catch((err) => console.error(`Broadcast to ${user.phoneNumber}:`, err.message))
          )
        );
        if (i + chunkSize < usersToAlert.length) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
      return true;
    } catch (error) {
      console.error("❌ Broadcast sequence error:", error);
      return null;
    }
  }
);

// ==========================================
// 🚀 TEMPLATE 1: NEW NEGOTIATION REQUEST
// ==========================================
exports.onDirectRfqCreated = onDocumentCreated(
  {
    document: "rfqs/{rfqId}",
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_MESSAGING_SERVICE_SID],
  },
  async (event) => {
    const rfqData = event.data.data();
    const rfqId = event.params.rfqId;
    if (!rfqData.sellerId) return null;
    try {
      const sellerDoc = await admin.firestore().collection("users").doc(rfqData.sellerId).get();
      if (!sellerDoc.exists) return null;
      const sellerData = sellerDoc.data();
      const sellerPhone = sellerData.phoneNumber || sellerData.phone;
      if (sellerPhone && sellerData.whatsappOptIn !== false) {
        const companyName = sellerData.companyName || sellerData.businessName || "Supplier";
        const targetPrice = rfqData.targetPrice || "Negotiable";
        const location = rfqData.deliveryPincode || "Check App";
        const deepLink = `https://app.prochemapp.com/negotiation/${rfqId}`;
        const msg = `🔔 *New Negotiation Request — Prochem*\n\nHi ${companyName},\n\nA verified buyer wants to negotiate on your product:\n\n🧪 *Product:* ${rfqData.productName}\n📦 *Qty Requested:* ${rfqData.targetQuantity} ${rfqData.unit}\n💰 *Buyer's Target Price:* ₹${targetPrice} / ${rfqData.unit}\n📍 *Delivery Location:* ${location}\n\n*Negotiation ID:* #${rfqId}\n\nTo view details and chat with the buyer, please click the button below.`;
        await sendWhatsApp(sellerPhone, msg, null, {
          templateName: "new_negotiation_alert",
          templateSid: "EME9M9cSy9FvfHvcx2gMPkp1H5Dj4YaKufPRsAyon8Tf",
          templateVariables: {
            "1": companyName, "2": rfqData.productName,
            "3": `${rfqData.targetQuantity} ${rfqData.unit}`,
            "4": String(targetPrice), "5": location, "6": rfqId, "7": deepLink,
          },
          type: "service", userId: rfqData.sellerId,
        });
      }
      return true;
    } catch (err) {
      console.error("Template 1 error:", err);
      return null;
    }
  }
);

// ==========================================
// 🚀 INBOUND WHATSAPP WEBHOOK
// ==========================================
exports.whatsappWebhook = functions.region("asia-south1").https.onRequest(async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  try {
    const { From, Body, WaId } = req.body;
    if (From && WaId) {
      const incomingNumber = From.replace("whatsapp:", "");
      let localNumber = incomingNumber;
      if (incomingNumber.startsWith("+91")) localNumber = incomingNumber.substring(3);
      const usersRef = admin.firestore().collection("users");
      let snapshot = await usersRef.where("phoneNumber", "==", localNumber).get();
      if (snapshot.empty) snapshot = await usersRef.where("phoneNumber", "==", incomingNumber).get();
      if (snapshot.empty) snapshot = await usersRef.where("phone", "==", localNumber).get();
      if (snapshot.empty) snapshot = await usersRef.where("phone", "==", incomingNumber).get();
      let senderId = snapshot.empty ? null : snapshot.docs[0].id;
      const db = admin.firestore();
      const rawBody = Body.trim();
      const incomingLogRef = await db.collection("whatsappLogs").add({
        direction: "inbound", fromNumber: incomingNumber,
        messageSid: WaId, body: rawBody, senderUserId: senderId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(), status: "received",
      });
      if (!snapshot.empty) {
        snapshot.forEach(async (doc) => {
          const docData = doc.data();
          if (!docData.whatsappWaId) await doc.ref.update({ whatsappWaId: WaId, whatsappOptIn: true });
        });
        const upperCleanBody = rawBody.toUpperCase().replace(/\*/g, "");
        if (upperCleanBody.startsWith("INTEREST ")) {
          const rfqId = upperCleanBody.split(" ")[1];
          if (rfqId) {
            const rfqRef = db.collection("rfqs").doc(rfqId);
            const rfqSnap = await rfqRef.get();
            if (rfqSnap.exists) {
              const rfqData = rfqSnap.data();
              if (rfqData.sellerId === senderId) {
                const convQuery = await db.collection("conversations").where("rfqId", "==", rfqId).get();
                let conversationId;
                if (convQuery.empty) {
                  const newConvRef = await db.collection("conversations").add({
                    buyerUserId: rfqData.buyerId, sellerUserId: rfqData.sellerId,
                    rfqId: rfqId, status: "open",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                  conversationId = newConvRef.id;
                } else {
                  conversationId = convQuery.docs[0].id;
                  await db.collection("conversations").doc(conversationId).update({
                    status: "open",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                }
                await incomingLogRef.update({ conversationId });
                const deepLink = `https://app.prochemapp.com/negotiation/${rfqId}`;
                await sendWhatsApp(incomingNumber, `✅ Your interest is recorded. Negotiation started for ${rfqData.productName} (RFQ ID: ${rfqId}).\n\n👉 Open App to view: ${deepLink}`, null,
                  { templateName: "Interest_Recorded", type: "service", userId: senderId, conversationId }
                );
              } else if (rfqData.buyerId === senderId) {
                await sendWhatsApp(incomingNumber, `ℹ️ You are the buyer for this requirement (ID: ${rfqId}).`, null, { templateName: "System_Error", type: "service", userId: senderId });
              } else {
                await sendWhatsApp(incomingNumber, `❌ You are not authorized to negotiate this RFQ (ID: ${rfqId}).`, null, { templateName: "System_Error", type: "service", userId: senderId });
              }
            } else {
              await sendWhatsApp(incomingNumber, `❌ We couldn't find an RFQ with ID: ${rfqId}.`, null, { templateName: "System_Error", type: "service", userId: senderId });
            }
          }
        } else {
          await sendWhatsApp(incomingNumber, `🚫 Direct replies via WhatsApp are not supported.\n\nPlease view and reply to active chats inside the platform.`, null,
            { templateName: "app_redirect_notice", templateSid: "HX_APP_REDIRECT_NOTICE_SID", type: "service", userId: senderId }
          );
        }
      }
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ WhatsApp webhook error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// ==========================================
// 🚀 IN-APP MESSAGE TO WHATSAPP
// ==========================================
exports.onAppMessageCreated = onDocumentCreated(
  {
    document: "conversations/{conversationId}/messages/{messageId}",
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_MESSAGING_SERVICE_SID],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;
    const messageData = snap.data();
    const conversationId = event.params.conversationId;
    if (messageData.source !== "app") return null;
    try {
      const db = admin.firestore();
      const convDoc = await db.collection("conversations").doc(conversationId).get();
      if (!convDoc.exists) return null;
      const convData = convDoc.data();
      if (convData.status !== "open") return null;
      let targetUserId;
      if (messageData.senderRole === "buyer") targetUserId = convData.sellerUserId;
      else if (messageData.senderRole === "seller") targetUserId = convData.buyerUserId;
      else return null;
      const targetUserDoc = await db.collection("users").doc(targetUserId).get();
      const rfqDoc = await db.collection("rfqs").doc(convData.rfqId).get();
      if (targetUserDoc.exists && rfqDoc.exists) {
        const targetUserData = targetUserDoc.data();
        const rfqData = rfqDoc.data();
        const prefs = targetUserData.whatsappPreferences || {};
        const wantsNegotiations = prefs.negotiations !== false;
        const targetPhone = targetUserData.phoneNumber || targetUserData.phone;
        if (targetPhone && targetUserData.whatsappOptIn !== false && wantsNegotiations) {
          const deepLink = `https://app.prochemapp.com/negotiation/${convData.rfqId}`;
          let outMsg = "", templateUsed = "", templateSid = "", templateVariables = {};
          if (messageData.isOffer && messageData.senderRole === "seller") {
            const totalValue = (messageData.proposedQty * messageData.proposedPrice).toFixed(2);
            outMsg = `💰 *Formal Offer Received*\n_Prochem — Negotiation #${convData.rfqId}_\n\nThe supplier has sent you a confirmed offer:\n\n🧪 ${rfqData.productName}\n📦 Qty: ${messageData.proposedQty} ${rfqData.unit}\n💵 Price: ₹${messageData.proposedPrice}\n\n*Total Value: ₹${totalValue}* (excl. GST & fees)\n\n👉 Open in App to Accept: ${deepLink}`;
            templateUsed = "formal_offer_received";
            templateSid = "HX3b3ccf973fe8a1dcea5586c1714bc671";
            templateVariables = { "1": convData.rfqId, "2": rfqData.productName, "3": `${messageData.proposedQty} ${rfqData.unit}`, "4": String(messageData.proposedPrice), "5": totalValue, "6": deepLink };
          } else {
            const actualMsg = messageData.body || messageData.text;
            if (!actualMsg) return null;
            outMsg = `💬 *New Message — Prochem Negotiation*\n\n*Requirement:* ${rfqData.productName} (#${convData.rfqId})\n\n*Message:*\n"${actualMsg}"\n\n_To reply to this message securely, please open the app._`;
            templateUsed = "chat_message_relay";
            templateSid = "HXde0a53b6349cdd5e03b33dd6a6638245";
            templateVariables = { "1": rfqData.productName, "2": convData.rfqId, "3": actualMsg, "4": deepLink };
          }
          if (outMsg !== "") {
            await sendWhatsApp(targetPhone, outMsg, null, {
              templateName: templateUsed, templateSid, templateVariables,
              type: "service", userId: targetUserId, conversationId,
            });
          }
        }
      }
      return true;
    } catch (error) {
      console.error("❌ In-app message forwarding error:", error);
      return null;
    }
  }
);

// ==========================================
// 🚀 TEMPLATE 4: OFFER ACCEPTED
// ==========================================
exports.onRfqUpdated = onDocumentUpdated(
  {
    document: "rfqs/{rfqId}",
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER],
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const rfqId = event.params.rfqId;
    if (before.status !== "CONVERTED" && after.status === "CONVERTED") {
      try {
        const sellerDoc = await admin.firestore().collection("users").doc(after.sellerId).get();
        if (!sellerDoc.exists) return null;
        const sellerData = sellerDoc.data();
        const sellerPhone = sellerData.phoneNumber || sellerData.phone;
        if (sellerPhone && sellerData.whatsappOptIn !== false) {
          const subtotal = after.agreedQuantity * after.agreedPrice;
          const gst = subtotal * 0.18;
          const totalWithGst = subtotal + gst;
          const fees = totalWithGst * 0.015;
          const payoutAmount = (totalWithGst - fees).toFixed(2);
          const deepLink = `https://app.prochemapp.com/orders/${rfqId}`;
          const msg = `🎉 *Buyer Accepted Your Offer!*\n_Prochem — Negotiation #${rfqId}_\n\n*Product:* ${after.productName}\n*Quantity:* ${after.agreedQuantity} ${after.unit}\n*Agreed Price:* ₹${after.agreedPrice}\n*Your Payout:* ₹${payoutAmount} _(after Prochem fees)_\n\nThe buyer is completing payment now.\nYou will receive a dispatch notification once payment is verified.\nPlease keep stock ready.`;
          await sendWhatsApp(sellerPhone, msg, null, {
            templateName: "offer_accepted_alert",
            templateSid: "HX71d16959f0a9fe8498278db4e34daab4",
            templateVariables: { "1": rfqId, "2": after.productName, "3": `${after.agreedQuantity} ${after.unit}`, "4": String(after.agreedPrice), "5": payoutAmount, "6": deepLink },
            type: "transactional", userId: after.sellerId,
          });
        }
        return true;
      } catch (err) {
        console.error("Template 5 error:", err);
        return null;
      }
    }
    return null;
  }
);

// ==========================================
// 🚀 WELCOME WHATSAPP MESSAGE ON SIGNUP
// ==========================================
exports.onUserCreated = onDocumentCreated(
  {
    document: "users/{userId}",
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;
    const userData = snap.data();
    const userId = event.params.userId;
    const userPhone = userData.phoneNumber || userData.phone;
    if (userPhone && userData.whatsappOptIn !== false) {
      try {
        const companyName = userData.companyName || "Valued User";
        const msg = `🧪 *Welcome to Prochem!*\n\nHi ${companyName}, your account is now active.\n\n*What you can do on Prochem:*\n• 🔍 Browse chemicals & pharma products\n• 📋 Post your requirements to get seller quotes\n• 💬 Negotiate price directly via this chat\n• 📦 Track your orders in real-time\n\nHere's how to get started:\n✅ *Step 1:* Complete your company profile\n✅ *Step 2:* Add your chemicals/products\n✅ *Step 3:* Start receiving live buyer requirements\n\n_Prochem — India's Trusted B2B Chemical Marketplace_`;
        await sendWhatsApp(userPhone, msg, null, {
          templateName: "prochem_welcome",
          templateSid: "HXcb7cb50a9601acbe304cc5a01fc1b89b",
          templateVariables: { "1": companyName },
          type: "marketing", userId,
        });
        return true;
      } catch (err) {
        console.error("❌ Welcome WhatsApp error:", err);
        return null;
      }
    }
    return null;
  }
);

// ==========================================
// 🚀 TWILIO TEST
// ==========================================
exports.sendWhatsAppTest = functions.region("asia-south1").https.onRequest(async (req, res) => {
  if (!process.env.MY_PERSONAL_WHATSAPP)
    return res.status(500).send("MY_PERSONAL_WHATSAPP is not configured.");
  try {
    const messageSid = await sendWhatsApp(
      process.env.MY_PERSONAL_WHATSAPP,
      "Hello! This is a test message from Prochem.",
      null,
      { templateName: "System_Test", type: "service" }
    );
    res.status(200).send(`Message sent! SID: ${messageSid}`);
  } catch (error) {
    res.status(500).send(`Failed: ${error.message}`);
  }
});

// ==========================================
// 🚀 CASHFREE: CREATE ORDER
// ==========================================
exports.createCashfreeOrder = functions.region("asia-south1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { amount, type, referenceId, customerDetails } = data;
  if (!amount || !type || !referenceId) {
    throw new functions.https.HttpsError("invalid-argument", "Amount, type, and referenceId are required.");
  }
  try {
    const Cashfree = getCashfree();
    Cashfree.XClientId = process.env.CASHFREE_APP_ID;
    Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
    Cashfree.XEnvironment = process.env.CASHFREE_ENVIRONMENT === "PRODUCTION"
      ? Cashfree.Environment.PRODUCTION : Cashfree.Environment.SANDBOX;
    const cashfreeOrderId = `cf_${type}_${referenceId}_${Date.now()}`.substring(0, 50);
    const request = {
      order_amount: amount, order_currency: "INR", order_id: cashfreeOrderId,
      customer_details: {
        customer_id: context.auth.uid.substring(0, 50),
        customer_phone: customerDetails?.phone || "9999999999",
        customer_email: customerDetails?.email || "user@prochem.in",
        customer_name: customerDetails?.name || "Prochem User",
      },
      order_meta: { return_url: "https://prochem.in/payment-status?order_id={order_id}" },
      order_tags: { type, referenceId },
    };
    const response = await Cashfree.PGCreateOrder("2023-08-01", request);
    if (type === "product") {
      await admin.firestore().collection("orders").doc(referenceId).update({
        cashfreeOrderId, paymentStatus: "PENDING_GATEWAY",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return { payment_session_id: response.data.payment_session_id, order_id: cashfreeOrderId };
  } catch (error) {
    console.error("Cashfree Order Error:", error.response?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to create Cashfree order.");
  }
});

// ==========================================
// 🚀 CASHFREE: WEBHOOK
// ==========================================
exports.cashfreeWebhook = functions.region("asia-south1").https.onRequest(async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  try {
    const Cashfree = getCashfree();
    Cashfree.XClientId = process.env.CASHFREE_APP_ID;
    Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
    Cashfree.XEnvironment = process.env.CASHFREE_ENVIRONMENT === "PRODUCTION"
      ? Cashfree.Environment.PRODUCTION : Cashfree.Environment.SANDBOX;
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    if (!signature || !timestamp) return res.status(400).send("Missing security headers");
    Cashfree.PGVerifyWebhookSignature(signature, req.rawBody.toString(), timestamp);
    const payload = req.body;
    if (payload.type === "PAYMENT_SUCCESS_WEBHOOK") {
      const orderData = payload.data.order;
      const paymentData = payload.data.payment;
      const tags = orderData.order_tags || {};
      const type = tags.type;
      const referenceId = tags.referenceId;
      const customerId = orderData.customer_details.customer_id;
      if (type === "subscription") {
        await admin.firestore().collection("transactions").add({
          userId: customerId, type: "SUBSCRIPTION_UPGRADE", planId: referenceId,
          cashfreeOrderId: orderData.order_id, paymentId: paymentData.cf_payment_id,
          status: "SUCCESS", createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await admin.firestore().collection("users").doc(customerId).update({
          subscriptionTier: "GROWTH_PACKAGE", subscriptionPlan: referenceId,
          subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (type === "product") {
        await admin.firestore().collection("orders").doc(referenceId).update({
          status: "PENDING_SELLER", paymentStatus: "PAID",
          paymentDetails: {
            cashfreePaymentId: paymentData.cf_payment_id,
            cashfreeOrderId: orderData.order_id,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      }
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error("Cashfree webhook error:", error.message);
    res.status(400).send("Webhook verification failed");
  }
});

// ==========================================
// 🚀 DBS HYPERCHECKOUT: CREATE SESSION
//    (PRODUCTION — no sandbox caps)
// ==========================================
exports.createJuspaySession = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const {
      type = "product",
      referenceId,
      customerDetails,
      mandate,
      // ✅ NEW: TPV params
      orderType,              // "TPV_PAYMENT" for TPV
      bankAccountDetails,     // array of { bank_account_number, bank_ifsc, bank_beneficiary_name, ... }
      // ✅ NEW: eNACH flag
      useEnach = false,       // if true → action=enach, service=in.juspay.ec
      amount: customAmount,   // for eNACH which may have standalone amounts
    } = data || {};

    // ─── Validate type ───
    if (!referenceId && customAmount === undefined) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid referenceId or explicit amount is required."
      );
    }
    if (!["product", "subscription", "subscription_autopay"].includes(type)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid payment type.",
        { errorCode: "invalid_input", subCode: "MISSING_PARAMETER", retryable: false, userAction: "fix_request" }
      );
    }

    // ─── TPV validation: only UPI and Net Banking support TPV ───
    if (orderType === "TPV_PAYMENT") {
      if (!Array.isArray(bankAccountDetails) || bankAccountDetails.length === 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "orderType=TPV_PAYMENT requires bankAccountDetails as a non-empty array."
        );
      }
      for (const acct of bankAccountDetails) {
        if (!acct.bank_account_number || !acct.bank_ifsc || !acct.bank_beneficiary_name) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Each bank account in bankAccountDetails must include bank_account_number, bank_ifsc, and bank_beneficiary_name."
          );
        }
      }
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const clientId = process.env.JUSPAY_CLIENT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !clientId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition",
        "DBS server credentials are not configured.",
        { errorCode: "internal_error", retryable: false, userAction: "contact_support" }
      );
    }

    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    const returnUrl =
      process.env.JUSPAY_RETURN_URL ||
      (projectId ? `https://asia-south1-${projectId}.cloudfunctions.net/juspayReturn` : null);
    if (!returnUrl || !returnUrl.startsWith("https://")) {
      throw new functions.https.HttpsError("failed-precondition",
        "JUSPAY_RETURN_URL must be configured as an HTTPS URL.",
        { errorCode: "internal_error", retryable: false, userAction: "contact_support" }
      );
    }

    let amountInRupees, planTier, subscriptionDurationDays, orderSnapshot, mandateConfig = null;

    if (type === "subscription" || type === "subscription_autopay") {
      const plan = JUSPAY_SUBSCRIPTION_PLANS[referenceId];
      if (!plan) throw new functions.https.HttpsError("invalid-argument", "Unknown subscription plan.");
      amountInRupees = plan.amount;
      planTier = plan.tier;
      subscriptionDurationDays = plan.durationDays;

      if (type === "subscription_autopay") {
        if (!mandate || !mandate.maxAmount || !mandate.frequency) {
          throw new functions.https.HttpsError("invalid-argument",
            "mandate.maxAmount and mandate.frequency are required for subscription_autopay."
          );
        }

        const freq = String(mandate.frequency).toUpperCase();
        if (!MANDATE_FREQUENCIES.includes(freq)) {
          throw new functions.https.HttpsError("invalid-argument",
            `Unsupported mandate.frequency "${freq}". Allowed: ${MANDATE_FREQUENCIES.join(", ")}.`
          );
        }

        let ruleValue = mandate.ruleValue;
        if (FREQUENCIES_REQUIRING_RULE_VALUE.includes(freq)) {
          if (ruleValue === undefined || ruleValue === null || ruleValue === "") {
            ruleValue = defaultRuleValue(freq);
          }
          ruleValue = Number(ruleValue);
          if (!Number.isFinite(ruleValue) || ruleValue < 1) {
            throw new functions.https.HttpsError("invalid-argument",
              "mandate.ruleValue must be a positive integer."
            );
          }
        }

        const startDateEpoch = mandate.startDate || todayUtcMidnightEpoch();
        const endDateEpoch = mandate.endDate ||
          startDateEpoch + Number(subscriptionDurationDays || 365) * 86400;

        mandateConfig = {
          maxAmount: Number(mandate.maxAmount).toFixed(2),
          frequency: freq,
          ruleValue,
          startDate: startDateEpoch,
          endDate: endDateEpoch,
          amountRule: mandate.amountRule || MANDATE_AMOUNT_RULE.VARIABLE,
          revokableByCustomer: mandate.revokableByCustomer !== false,
          blockFunds: mandate.blockFunds ?? false,
        };
      }
    } else if (referenceId) {
      orderSnapshot = await admin.firestore().collection("orders").doc(referenceId).get();
      if (!orderSnapshot.exists || orderSnapshot.data().buyerId !== context.auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Order does not belong to the current user.");
      }
      amountInRupees = Number(orderSnapshot.data().totalAmount);
    } else if (customAmount !== undefined) {
      // Custom amount flow (for standalone eNACH/TPV registration)
      amountInRupees = Number(customAmount);
    }

    if (!Number.isFinite(amountInRupees) || amountInRupees < 1) {
      throw new functions.https.HttpsError("invalid-argument", "The payable amount is invalid.");
    }

    const dbsOrderId = `dbs${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`.slice(0, 21);
    const phone = String(customerDetails?.phone || "9999999999").replace(/[^0-9]/g, "").slice(-10);
    const email = customerDetails?.email || "buyer@prochem.in";
    const sessionUrl = getDbsSessionUrl();

    const sessionPayload = {
      order_id: dbsOrderId,
      amount: amountInRupees.toFixed(2),
      currency: "INR",
      customer_id: context.auth.uid,
      customer_email: email,
      customer_phone: phone,
      payment_page_client_id: clientId,
      action: useEnach ? "enach" : "paymentPage",
      return_url: returnUrl,
      description: "ProchemAPP Order",
      // Leave payment-method configuration to the Juspay client / merchant default page.
      // This ensures the payment page reflects the options configured in the backend client ID,
      // instead of forcing a custom QR-only flow.
    };

    // ✅ eNACH: override service
    if (useEnach) {
      sessionPayload["service"] = "in.juspay.ec";
      console.log("[DBS] eNACH registration: service=in.juspay.ec, action=enach");
    }

    // ✅ TPV: set order_type and bank_account_details
    if (orderType === "TPV_PAYMENT") {
      sessionPayload["order_type"] = "TPV_PAYMENT";
      // Stringify the array per DBS spec
      sessionPayload["metadata.bank_account_details"] = JSON.stringify(bankAccountDetails);
      console.log("[DBS] TPV enabled:", {
        order_type: "TPV_PAYMENT",
        bank_accounts_count: bankAccountDetails.length,
      });
    }

    // ─── Mandate params ───
    if (mandateConfig) {
      sessionPayload["options.create_mandate"] = "REQUIRED";

      if (mandateConfig.amountRule === MANDATE_AMOUNT_RULE.VARIABLE) {
        sessionPayload["mandate.max_amount"] = String(mandateConfig.maxAmount);
      }

      sessionPayload["mandate.frequency"] = String(mandateConfig.frequency);
      sessionPayload["mandate.start_date"] = String(mandateConfig.startDate);
      sessionPayload["mandate.end_date"] = String(mandateConfig.endDate);
      sessionPayload["mandate.amount_rule"] = String(mandateConfig.amountRule);
      sessionPayload["mandate.revokable_by_customer"] = String(mandateConfig.revokableByCustomer !== false);

      if (mandateConfig.ruleValue !== null && mandateConfig.ruleValue !== undefined) {
        sessionPayload["mandate.rule_value"] = String(mandateConfig.ruleValue);
      }
      if (mandateConfig.blockFunds === true) {
        sessionPayload["mandate.block_funds"] = "true";
      }
    }

    console.log("[DBS] Session payload:", {
      order_id: dbsOrderId,
      action: sessionPayload["action"],
      service: sessionPayload["service"] || "(default)",
      order_type: sessionPayload["order_type"] || "(default)",
      amount: sessionPayload["amount"],
      mandate: mandateConfig ? "yes" : "no",
      tpv: orderType === "TPV_PAYMENT" ? "yes" : "no",
      enach: useEnach ? "yes" : "no",
    });

    try {
      const response = await retryWithBackoff(
        () => axios.post(sessionUrl, sessionPayload, {
          headers: {
            Authorization: getDbsAuthHeader(),
            "Content-Type": "application/json",
            "x-merchantid": merchantId,
            "x-routing-id": context.auth.uid,
          },
          timeout: 20000,
        }),
        "DBS-Session"
      );

      const payload = response.data || {};
      if (!payload.sdk_payload) throw new Error("DBS did not return a payment session.");

      await admin.firestore().collection("juspaySessions").doc(dbsOrderId).set({
        juspayOrderId: dbsOrderId,
        userId: context.auth.uid,
        type,
        referenceId: referenceId || null,
        amount: amountInRupees,
        status: "PENDING",
        // ✅ Track flow type
        flowType: useEnach ? "ENACH" : orderType === "TPV_PAYMENT" ? "TPV" : "STANDARD",
        // ✅ TPV metadata
        ...(orderType === "TPV_PAYMENT"
          ? {
              orderType: "TPV_PAYMENT",
              tpvBankAccounts: bankAccountDetails.map((a) => ({
                bank_account_number: a.bank_account_number,
                bank_ifsc: a.bank_ifsc,
                bank_beneficiary_name: a.bank_beneficiary_name,
                bank_account_type: a.bank_account_type || null,
              })),
            }
          : {}),
        ...(planTier ? { planTier, subscriptionDurationDays } : {}),
        ...(mandateConfig
          ? {
              mandatePending: true,
              mandateConfig,
              mandateStatus: MANDATE_STATUS.CREATED,
              mandateFrequency: mandateConfig.frequency,
              mandateRuleValue: mandateConfig.ruleValue,
              mandateMaxAmount: Number(mandateConfig.maxAmount),
              mandateStartDate: mandateConfig.startDate,
              mandateEndDate: mandateConfig.endDate,
            }
          : {}),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (type === "product" && referenceId) {
        await admin.firestore().collection("orders").doc(referenceId).update({
          juspayOrderId: dbsOrderId,
          paymentStatus: "PENDING_GATEWAY",
          paymentReference: "DBS_HYPERCHECKOUT",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return {
        order_id: dbsOrderId,
        sdk_payload: payload.sdk_payload,
        payment_url: payload.payment_links?.web || payload.payment_links?.mobile || null,
        mandate_requested: !!mandateConfig,
        flow_type: useEnach ? "ENACH" : orderType === "TPV_PAYMENT" ? "TPV" : "STANDARD",
      };
    } catch (error) {
      const parsed = parseDbsError(error);
      console.error("[DBS] ══════ SESSION API ERROR ══════");
      console.error("[DBS] HTTP Status:", parsed.httpStatus);
      console.error("[DBS] Error Code:", parsed.errorCode);
      console.error("[DBS] Sub Code:", parsed.subCode);
      console.error("[DBS] Message:", parsed.message);
      console.error("[DBS] Full request payload:", JSON.stringify(sessionPayload, null, 2));
      console.error("[DBS] Full DBS response:", JSON.stringify(error.response?.data, null, 2));
      console.error("[DBS] ══════════════════════════════");

      let httpsCode = "internal";
      if (parsed.httpStatus === 400) httpsCode = "invalid-argument";
      else if (parsed.httpStatus === 401) httpsCode = "unauthenticated";
      else if (parsed.httpStatus === 403) httpsCode = "permission-denied";
      else if (parsed.httpStatus === 404) httpsCode = "not-found";
      else if (parsed.httpStatus === 415) httpsCode = "invalid-argument";
      else if (parsed.httpStatus === 422) httpsCode = "invalid-argument";

      throw new functions.https.HttpsError(httpsCode, parsed.message, {
        errorCode: parsed.errorCode,
        subCode: parsed.subCode,
        retryable: parsed.retryable,
        userAction: parsed.userAction,
        httpStatus: parsed.httpStatus,
      });
    }
  });

// ==========================================
// 🚀 MANDATE APIs
// ==========================================
exports.executeMandatePayment = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { mandateId, orderId, amount, customerId, executionDate } = data || {};
    if (!mandateId || !orderId || !amount) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "mandateId, orderId, and amount are required."
      );
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");
    }

    // ─── Step 1: Verify mandate is ACTIVE before attempting debit ───
    const mandateDoc = await admin.firestore().collection("mandates").doc(mandateId).get();
    if (mandateDoc.exists) {
      const m = mandateDoc.data();
      const currentStatus = m.status;

      if (currentStatus !== MANDATE_STATUS.ACTIVE) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Cannot execute mandate: current status is ${currentStatus}. Only ACTIVE mandates can be debited.`
        );
      }

      // Sanity: check mandate hasn't expired
      if (m.endDate && Number(m.endDate) * 1000 < Date.now()) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Mandate has expired. Cannot debit."
        );
      }
    }

    const effectiveCustomerId = customerId || context.auth.uid;

    // ─── Step 2: Build form-encoded body per DBS spec ───
    //   Content-Type: application/x-www-form-urlencoded
    //   Flattened keys: order.order_id, order.amount, order.customer_id, etc.
    const formBody = new URLSearchParams();
    formBody.append("order.order_id", String(orderId));
    formBody.append("order.amount", String(amount));
    formBody.append("order.customer_id", String(effectiveCustomerId));
    formBody.append("merchant_id", String(merchantId));
    formBody.append("mandate_id", String(mandateId));
    formBody.append("format", "json");

    // ✅ Optional execution_date — only for DBS-managed-notification merchants.
    //    If omitted, DBS schedules execution at the 25th hour after notification.
    if (executionDate !== undefined && executionDate !== null) {
      formBody.append("mandate.execution_date", String(executionDate));
    }

    try {
      const response = await retryWithBackoff(
        () =>
          axios.post(
            `${getDbsOrderStatusBaseUrl()}/txns`,
            formBody.toString(),
            {
              headers: {
                Authorization: getDbsAuthHeader(),
                "x-merchantid": merchantId,
                "x-routing-id": effectiveCustomerId,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              timeout: 30000,
            }
          ),
        "DBS-Mandate-Execute"
      );

      const payload = response.data || {};
      const status = String(payload.status || "").toUpperCase();
      const authenticationUrl = payload.payment?.authentication?.url || null;

      console.log("[DBS] Mandate execution accepted:", {
        mandate_id: mandateId,
        order_id: orderId,
        amount,
        status,
        txn_id: payload.txn_id,
        hasAuthUrl: !!authenticationUrl,
      });

      // ─── Persist the debit attempt ───
      await admin.firestore().collection("mandateDebits").add({
        mandateId,
        orderId: String(orderId),
        amount: Number(amount),
        customerId: effectiveCustomerId,
        status: status || "PENDING",
        txnId: payload.txn_id || null,
        txnUuid: payload.txn_uuid || null,
        authenticationUrl,           // ✅ stored for PENDING_VBV flows
        notificationStatus: "PENDING",
        source: "MANUAL",
        retryCount: 0,
        rawResponse: payload,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        mandate_id: mandateId,
        order_id: orderId,
        status,
        txn_id: payload.txn_id || null,
        txn_uuid: payload.txn_uuid || null,
        authentication_url: authenticationUrl,
        message:
          status === "PENDING_VBV"
            ? "Notification sent to customer. Awaiting debit confirmation."
            : "Mandate execution initiated. Awaiting notification webhook.",
        raw: payload,
      };
    } catch (error) {
      const resp = error.response;
      console.error("[DBS] Mandate execution error:", resp?.data || error.message);

      if (resp && resp.data?.error_code) {
        return {
          success: false,
          mandate_id: mandateId,
          order_id: orderId,
          error_code: resp.data.error_code,
          message: resp.data.message || "Mandate execution failed.",
        };
      }

      throw new functions.https.HttpsError("internal", "Failed to execute mandate payment.");
    }
  });

exports.getMandateStatus = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { mandateId } = data || {};
    if (!mandateId) throw new functions.https.HttpsError("invalid-argument", "mandateId is required.");

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");
    }

    // ─── Form-encoded body: command=check_status ───
    const formBody = new URLSearchParams();
    formBody.append("command", "check_status");

    try {
      const response = await retryWithBackoff(
        () =>
          axios.post(
            `${getDbsOrderStatusBaseUrl()}/mandates/${encodeURIComponent(mandateId)}`,
            formBody.toString(),
            {
              headers: {
                Authorization: getDbsAuthHeader(),
                "x-merchantid": merchantId,
                "x-routing-id": context.auth.uid,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              timeout: 20000,
            }
          ),
        "DBS-Mandate-Status"
      );

      const payload = response.data || {};
      const status = String(payload.status || "").toUpperCase();
      const frequency = payload.frequency ? String(payload.frequency).toUpperCase() : null;
      const ruleValue = payload.rule_value != null ? Number(payload.rule_value) : null;
      const ruleType = payload.rule_type ? String(payload.rule_type).toUpperCase() : null;
      const maxAmount = payload.max_amount != null ? Number(payload.max_amount) : null;
      const paymentInfo = payload.payment_info || null;

      console.log("[DBS] Mandate status sync:", {
        mandate_id: mandateId,
        status,
        frequency,
        max_amount: maxAmount,
        mandate_type: payload.mandate_type,
        payment_method_type: paymentInfo?.payment_method_type,
      });

      // ─────────────────────────────────────────────────────────────
      // Persist everything DBS returned to Firestore
      // ─────────────────────────────────────────────────────────────
      const updatePayload = {
        status,
        order_id: payload.order_id || null,
        customerId: payload.customer_id || null,
        frequency,
        ruleValue,
        ruleType,
        maxAmount,
        currency: payload.currency || "INR",
        startDate: payload.start_date || null,
        endDate: payload.end_date || null,
        activatedAt: payload.activated_at || null,
        lastActivatedAt: payload.last_activated_at || null,
        lastUpdated: payload.last_updated || null,
        blockFund: payload.block_fund ?? null,
        revokableByCustomer: payload.revokable_by_customer ?? null,
        mandateType: payload.mandate_type || null,
        paymentInfo,
        mandateToken: payload.mandate_token || null,
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        rawStatusResponse: payload,
      };

      // Recompute nextDebitAt if the mandate is ACTIVE and we have schedule info
      if (status === MANDATE_STATUS.ACTIVE && frequency) {
        const nextDebitAt = computeNextDebitAt(
          frequency,
          ruleValue,
          ruleType || "AFTER",
          new Date()
        );
        updatePayload.nextDebitAt = nextDebitAt;
      }

      try {
        await admin.firestore().collection("mandates").doc(mandateId).set(updatePayload, { merge: true });
      } catch (fsErr) {
        console.warn("[DBS] Firestore mandate sync failed:", fsErr.message);
      }

      // ─────────────────────────────────────────────────────────────
      // Side effects: when mandate is no longer ACTIVE, disable auto-renew
      // on the user's profile so the app stops showing "Auto-Renew ON".
      // ─────────────────────────────────────────────────────────────
      const TERMINAL_STATUSES = [MANDATE_STATUS.REVOKED, MANDATE_STATUS.EXPIRED, MANDATE_STATUS.FAILURE];
      if (TERMINAL_STATUSES.includes(status) && payload.customer_id) {
        try {
          await admin.firestore().collection("users").doc(String(payload.customer_id)).set(
            {
              autoRenewEnabled: false,
              autoRenewDisabledReason: status,
              autoRenewDisabledAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          console.log(
            `[DBS] Disabled auto-renew for user ${payload.customer_id} (mandate ${mandateId} → ${status})`
          );
        } catch (fsErr) {
          console.warn("[DBS] Failed to update user auto-renew flag:", fsErr.message);
        }
      }

      return {
        mandate_id: payload.mandate_id || mandateId,
        status,
        order_id: payload.order_id || null,
        customer_id: payload.customer_id || null,
        frequency,
        rule_value: ruleValue,
        rule_type: ruleType,
        max_amount: maxAmount,
        amount_rule: payload.amount_rule || null,
        currency: payload.currency || "INR",
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        activated_at: payload.activated_at || null,
        last_activated_at: payload.last_activated_at || null,
        last_updated: payload.last_updated || null,
        block_fund: payload.block_fund ?? null,
        revokable_by_customer: payload.revokable_by_customer ?? null,
        mandate_type: payload.mandate_type || null,
        mandate_token: payload.mandate_token || null,
        payment_info: paymentInfo,
        raw: payload,
      };
    } catch (error) {
      console.error("[DBS] Mandate status error:", error.response?.data || error.message);

      const resp = error.response;
      if (resp && resp.data?.error_code) {
        throw new functions.https.HttpsError(
          "internal",
          resp.data.message || "Failed to fetch mandate status.",
          { errorCode: resp.data.error_code }
        );
      }
      throw new functions.https.HttpsError("internal", "Failed to fetch mandate status.");
    }
  });

exports.listCustomerMandates = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const customerId = data?.customerId || context.auth.uid;
    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");
    }

    try {
      const response = await retryWithBackoff(
        () =>
          axios.get(
            `${getDbsOrderStatusBaseUrl()}/customers/${encodeURIComponent(customerId)}/mandates`,
            {
              headers: {
                Authorization: getDbsAuthHeader(),
                "x-merchantid": merchantId,
                "x-routing-id": customerId,
                version: "2023-06-30",
                // Note: GET requests do not need Content-Type
              },
              timeout: 20000,
            }
          ),
        "DBS-List-Mandates"
      );

      const payload = response.data || {};

      // ─────────────────────────────────────────────────────────────
      // 🚨 CRITICAL FIX: DBS returns the array under `payload.list`
      //    Also support fallback keys in case of API version changes.
      // ─────────────────────────────────────────────────────────────
      const rawMandates =
        payload.list ||
        payload.mandates ||
        payload.data ||
        [];

      const count = payload.count ?? rawMandates.length;
      const offset = payload.offset ?? 0;
      const total = payload.total ?? rawMandates.length;

      console.log(`[DBS] List mandates for customer ${customerId}:`, {
        count, offset, total,
        returned: rawMandates.length,
      });

      // ─────────────────────────────────────────────────────────────
      // Normalize + cache each mandate in Firestore
      // ─────────────────────────────────────────────────────────────
      const normalizedMandates = rawMandates.map((m) => {
        const frequency = m.frequency ? String(m.frequency).toUpperCase() : null;
        const ruleValue = m.rule_value != null ? Number(m.rule_value) : null;
        const ruleType = m.rule_type ? String(m.rule_type).toUpperCase() : null;
        const maxAmount = m.max_amount != null ? Number(m.max_amount) : null;

        return {
          mandate_id: m.mandate_id,
          status: String(m.status || m.mandate_status || "").toUpperCase(),
          order_id: m.order_id || null,
          customer_id: m.customer_id || customerId,
          gateway: m.gateway || null,                    // ✅ NEW
          frequency,
          rule_value: ruleValue,
          rule_type: ruleType,
          amount_rule: m.amount_rule || null,
          max_amount: maxAmount,
          currency: m.currency || "INR",
          mandate_type: m.mandate_type || null,
          mandate_token: m.mandate_token || null,
          start_date: m.start_date || null,
          end_date: m.end_date || null,
          activated_at: m.activated_at || null,
          last_activated_at: m.last_activated_at || null,
          last_updated: m.last_updated || null,
          block_fund: m.block_fund ?? null,
          revokable_by_customer: m.revokable_by_customer ?? null,
          payment_info: m.payment_info || null,          // ✅ NEW
          pause_start_date: m.pause_start_date || null,  // ✅ NEW
          pause_end_date: m.pause_end_date || null,      // ✅ NEW
          raw: m,
        };
      });

      // ─────────────────────────────────────────────────────────────
      // Firestore bulk update
      // ─────────────────────────────────────────────────────────────
      if (normalizedMandates.length > 0) {
        const db = admin.firestore();
        const batch = db.batch();

        for (const m of normalizedMandates) {
          if (!m.mandate_id) continue;
          const ref = db.collection("mandates").doc(String(m.mandate_id));

          const update = {
            mandateId: String(m.mandate_id),
            status: m.status,
            customerId: m.customer_id,
            gateway: m.gateway,
            frequency: m.frequency,
            ruleValue: m.rule_value,
            ruleType: m.rule_type,
            amountRule: m.amount_rule,
            maxAmount: m.max_amount,
            currency: m.currency,
            mandateType: m.mandate_type,
            mandateToken: m.mandate_token,
            startDate: m.start_date,
            endDate: m.end_date,
            activatedAt: m.activated_at,
            lastActivatedAt: m.last_activated_at,
            lastUpdated: m.last_updated,
            blockFund: m.block_fund,
            revokableByCustomer: m.revokable_by_customer,
            paymentInfo: m.payment_info,
            pauseStartDate: m.pause_start_date,
            pauseEndDate: m.pause_end_date,
            lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            rawListResponse: m.raw,
          };

          // Compute nextDebitAt for ACTIVE mandates with a known frequency
          if (m.status === MANDATE_STATUS.ACTIVE && m.frequency) {
            update.nextDebitAt = computeNextDebitAt(
              m.frequency,
              m.rule_value,
              m.rule_type || "AFTER",
              new Date()
            );
          }

          batch.set(ref, update, { merge: true });
        }

        try {
          await batch.commit();
          console.log(`[DBS] Cached ${normalizedMandates.length} mandates for ${customerId}`);
        } catch (fsErr) {
          console.warn("[DBS] Firestore bulk mandate cache failed:", fsErr.message);
        }
      }

      return {
        count,
        offset,
        total,
        object: payload.object || "list",
        mandates: normalizedMandates,
      };
    } catch (error) {
      console.error("[DBS] List mandates error:", error.response?.data || error.message);
      throw new functions.https.HttpsError("internal", "Failed to list customer mandates.");
    }
  });

// Legacy alias — kept for backward compatibility.
// New code should use `executeMandatePayment` directly.
exports.executeJuspayMandate = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    return exports.executeMandatePayment.run
      ? exports.executeMandatePayment.run(data, context)
      : exports.executeMandatePayment(data, context);
  });

exports.listJuspayMandates = functions.region("asia-south1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const customerId = data?.customerId || context.auth.uid;
  const merchantId = process.env.JUSPAY_MERCHANT_ID;
  const apiKey = process.env.JUSPAY_API_KEY;
  if (!merchantId || !apiKey) throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
  try {
    const response = await axios.get(getJuspayCustomerMandatesEndpoint(customerId), {
      headers: {
        Authorization: getDbsAuthHeader(), "x-merchantid": merchantId,
        "x-routing-id": customerId, "Content-Type": "application/x-www-form-urlencoded", version: "2023-06-30",
      },
      timeout: 20000,
    });
    return response.data;
  } catch (error) {
    console.error("Juspay list mandates error:", error.response?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to fetch mandates.");
  }
});

exports.getJuspayMandateStatus = functions.region("asia-south1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { mandateId, orderId } = data || {};
  const lookupOrderId = orderId || mandateId;
  if (!lookupOrderId) throw new functions.https.HttpsError("invalid-argument", "orderId or mandateId is required.");
  const merchantId = process.env.JUSPAY_MERCHANT_ID;
  const apiKey = process.env.JUSPAY_API_KEY;
  if (!merchantId || !apiKey) throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
  try {
    const response = await axios.get(`${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(lookupOrderId)}`, {
      headers: {
        Authorization: getDbsAuthHeader(), "x-merchantid": merchantId,
        "x-routing-id": context.auth.uid, "Content-Type": "application/x-www-form-urlencoded", version: "2023-06-30",
      },
      timeout: 20000,
    });
    return response.data;
  } catch (error) {
    console.error("Juspay mandate status error:", error.response?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to fetch mandate status.");
  }
});

exports.pauseJuspayMandate = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { mandateId, pauseStartDate, pauseEndDate } = data || {};
    if (!mandateId) throw new functions.https.HttpsError("invalid-argument", "mandateId is required.");

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Fetch mandate from Firestore first
    // ─────────────────────────────────────────────────────────────
    const mandateRef = admin.firestore().collection("mandates").doc(mandateId);
    const mandateSnap = await mandateRef.get();

    if (!mandateSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Mandate not found. Please refresh and try again."
      );
    }

    const mandate = mandateSnap.data();

    // ─────────────────────────────────────────────────────────────
    // 2. Validate: only ACTIVE mandates can be paused
    // ─────────────────────────────────────────────────────────────
    if (mandate.status !== MANDATE_STATUS.ACTIVE) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Cannot pause mandate: current status is ${mandate.status}. Only ACTIVE mandates can be paused.`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Validate pause dates
    // ─────────────────────────────────────────────────────────────
    const nowEpoch = Math.floor(Date.now() / 1000);
    const startEpoch = pauseStartDate ? Number(pauseStartDate) : nowEpoch;
    const endEpoch = pauseEndDate ? Number(pauseEndDate) : null;

    if (!Number.isFinite(startEpoch) || startEpoch < 1) {
      throw new functions.https.HttpsError("invalid-argument", "pauseStartDate must be a valid UNIX epoch.");
    }

    if (endEpoch !== null) {
      if (!Number.isFinite(endEpoch) || endEpoch < 1) {
        throw new functions.https.HttpsError("invalid-argument", "pauseEndDate must be a valid UNIX epoch.");
      }
      if (startEpoch >= endEpoch) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "pauseStartDate must be earlier than pauseEndDate."
        );
      }
      // pause_end_date cannot exceed mandate end_date
      if (mandate.endDate && endEpoch > Number(mandate.endDate)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "pauseEndDate cannot exceed the mandate's end date."
        );
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Build form-encoded body
    // ─────────────────────────────────────────────────────────────
    const formBody = new URLSearchParams();
    formBody.append("command", "pause");
    formBody.append("pause_start_date", String(startEpoch));
    if (endEpoch !== null) {
      formBody.append("pause_end_date", String(endEpoch));
    }

    try {
      const response = await axios.post(
        getJuspayMandateEndpoint(mandateId),
        formBody.toString(),
        {
          headers: {
            Authorization: getDbsAuthHeader(),
            "x-merchantid": merchantId,
            "x-routing-id": context.auth.uid,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 20000,
        }
      );

      const payload = response.data || {};
      const newStatus = String(payload.status || "PAUSED").toUpperCase();

      console.log(`[DBS] Mandate ${mandateId} paused successfully:`, {
        status: newStatus,
        pause_start: startEpoch,
        pause_end: endEpoch,
      });

      // ─────────────────────────────────────────────────────────────
      // 5. Update Firestore
      // ─────────────────────────────────────────────────────────────
      try {
        await mandateRef.set(
          {
            status: newStatus === "ACTIVE" ? "PAUSED" : newStatus,
            pauseStartDate: startEpoch,
            pauseEndDate: endEpoch,
            pausedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            rawPauseResponse: payload,
          },
          { merge: true }
        );

        // Disable auto-renew indicator on user profile while paused
        if (mandate.customerId) {
          await admin.firestore().collection("users").doc(String(mandate.customerId)).set(
            {
              autoRenewPaused: true,
              autoRenewPauseEndDate: endEpoch,
              autoRenewPausedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch (fsErr) {
        console.warn("[DBS] Firestore pause update failed:", fsErr.message);
      }

      return {
        success: true,
        mandate_id: mandateId,
        status: "PAUSED",
        pause_start_date: startEpoch,
        pause_end_date: endEpoch,
        message: endEpoch
          ? `Mandate will resume on ${new Date(endEpoch * 1000).toLocaleDateString()}.`
          : "Mandate paused indefinitely.",
        raw: payload,
      };
    } catch (error) {
      const resp = error.response;
      const errData = resp?.data || {};

      console.error("[DBS] Pause mandate error:", errData || error.message);

      // ─────────────────────────────────────────────────────────────
      // 6. Map known DBS error codes to friendly messages
      // ─────────────────────────────────────────────────────────────
      const errorMap = {
        MANDATE_NOT_FOUND: "Mandate not found.",
        INVALID_STATUS_CHANGE: `Cannot pause mandate: current status is ${mandate.status}.`,
        INVALID_PAUSE_START_DATE: "Invalid pause start date.",
        INVALID_PAUSE_END_DATE: "Invalid pause end date.",
        INVALID_PAUSE_DATES: "Pause end date must be after pause start date.",
        MANDATE_NOT_ACTIVE: "Only ACTIVE mandates can be paused.",
      };

      const errCode = errData.error_code || errData.code;
      const friendlyMessage =
        errorMap[errCode] ||
        errData.message ||
        errData.error_message ||
        "Failed to pause mandate.";

      throw new functions.https.HttpsError(
        resp?.status === 404 ? "not-found" : "internal",
        friendlyMessage,
        { errorCode: errCode || null }
      );
    }
  });

exports.revokeJuspayMandate = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { mandateId, shouldDoImplicitRevoke = false } = data || {};
    if (!mandateId) throw new functions.https.HttpsError("invalid-argument", "mandateId is required.");

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Load mandate from Firestore
    // ─────────────────────────────────────────────────────────────
    const mandateRef = admin.firestore().collection("mandates").doc(String(mandateId));
    const mandateSnap = await mandateRef.get();

    if (!mandateSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Mandate not found. Please refresh and try again."
      );
    }

    const mandate = mandateSnap.data();
    const customerId = mandate.customerId || context.auth.uid;

    // ─────────────────────────────────────────────────────────────
    // 2. Validate mandate status
    //    Per spec: "Revokes or cancels an ACTIVE mandate."
    //    Paused mandates should be resumed first or revoked with
    //    should_do_implicit_revoke = true.
    // ─────────────────────────────────────────────────────────────
    if (mandate.status === MANDATE_STATUS.REVOKED) {
      // Idempotent — already revoked, no-op
      return {
        success: true,
        mandate_id: mandateId,
        status: "REVOKED",
        message: "Mandate was already revoked.",
        alreadyRevoked: true,
      };
    }

    if (mandate.status === MANDATE_STATUS.EXPIRED) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Cannot revoke an EXPIRED mandate."
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Build form-encoded body per DBS spec
    // ─────────────────────────────────────────────────────────────
    const formBody = new URLSearchParams();
    formBody.append("command", "revoke");
    // String("true") or String("false") — DBS expects exactly that
    formBody.append("should_do_implicit_revoke", shouldDoImplicitRevoke ? "true" : "false");

    try {
      const response = await axios.post(
        getJuspayMandateEndpoint(mandateId),
        formBody.toString(),
        {
          headers: {
            Authorization: getDbsAuthHeader(),
            "x-merchantid": merchantId,
            "x-routing-id": customerId,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 30000, // gateway revocation may take a while
        }
      );

      const payload = response.data || {};

      // ─────────────────────────────────────────────────────────────
      // 4. Parse response — DBS uses `mandate_status`, not `status`
      // ─────────────────────────────────────────────────────────────
      const newStatus = String(
        payload.mandate_status || payload.status || ""
      ).toUpperCase();

      const gatewayResponseCode = payload.gateway_response_code || null;
      const gatewayResponseMessage = payload.gateway_response_message || null;

      // Detect the "gateway failure without implicit revoke" case:
      //   {
      //     "mandate_id": "...",
      //     "mandate_status": "ACTIVE",         ← still active!
      //     "gateway_response_code": "200",
      //     "gateway_response_message": "Bank Issues a Timeout"
      //   }
      const gatewayFailedAndMandateStillActive =
        newStatus === MANDATE_STATUS.ACTIVE &&
        (gatewayResponseCode || gatewayResponseMessage);

      console.log("[DBS] Revoke mandate response:", {
        mandate_id: mandateId,
        mandate_status: newStatus,
        gateway_response_code: gatewayResponseCode,
        gateway_response_message: gatewayResponseMessage,
        gatewayFailedAndMandateStillActive,
      });

      // ─────────────────────────────────────────────────────────────
      // 5. Persist the result based on what actually happened
      // ─────────────────────────────────────────────────────────────
      const now = admin.firestore.FieldValue.serverTimestamp();

      if (newStatus === MANDATE_STATUS.REVOKED) {
        // ✅ Full success — mandate is dead at DBS (and gateway if implicit)
        try {
          await mandateRef.set(
            {
              status: MANDATE_STATUS.REVOKED,
              revokedAt: now,
              revocationMode: shouldDoImplicitRevoke ? "IMPLICIT" : "STANDARD",
              lastSyncedAt: now,
              rawRevokeResponse: payload,
            },
            { merge: true }
          );

          // Disable user auto-renew
          await admin.firestore().collection("users").doc(String(customerId)).set(
            {
              autoRenewEnabled: false,
              autoRenewPaused: false,
              autoRenewPauseEndDate: null,
              autoRenewDisabledReason: "REVOKED",
              autoRenewDisabledAt: now,
            },
            { merge: true }
          );

          console.log(`[DBS] Mandate ${mandateId} revoked successfully for user ${customerId}`);
        } catch (fsErr) {
          console.warn("[DBS] Firestore revoke persistence failed:", fsErr.message);
        }

        return {
          success: true,
          mandate_id: mandateId,
          status: MANDATE_STATUS.REVOKED,
          message: "Mandate revoked successfully. Auto-renewal has been disabled.",
          raw: payload,
        };
      }

      if (gatewayFailedAndMandateStillActive) {
        // ⚠️ Gateway refused to revoke, and should_do_implicit_revoke was FALSE.
        //    Mandate stays ACTIVE at DBS. We must tell the client this.
        try {
          await mandateRef.set(
            {
              lastRevokeAttemptAt: now,
              lastRevokeAttemptFailed: true,
              lastRevokeAttemptReason: gatewayResponseMessage || gatewayResponseCode,
              lastSyncedAt: now,
              rawRevokeResponse: payload,
            },
            { merge: true }
          );
        } catch (fsErr) {
          console.warn("[DBS] Firestore revoke-attempt persistence failed:", fsErr.message);
        }

        console.warn(
          `[DBS] Mandate ${mandateId} revoke failed at gateway: ${gatewayResponseMessage}. ` +
          `Mandate is still ACTIVE.`
        );

        return {
          success: false,
          mandate_id: mandateId,
          status: MANDATE_STATUS.ACTIVE,
          gateway_response_code: gatewayResponseCode,
          gateway_response_message: gatewayResponseMessage,
          message:
            `Gateway could not revoke the mandate: ` +
            `${gatewayResponseMessage || gatewayResponseCode || "Unknown error"}. ` +
            `The mandate is still active. Try again with "Force revoke" enabled.`,
          raw: payload,
        };
      }

      // Unknown response shape — log and treat as partial failure
      console.error(
        `[DBS] Unexpected revoke response for mandate ${mandateId}:`, payload
      );
      return {
        success: false,
        mandate_id: mandateId,
        status: newStatus || "UNKNOWN",
        message: "Unexpected response from gateway. Please check mandate status.",
        raw: payload,
      };
    } catch (error) {
      const resp = error.response;
      const errData = resp?.data || {};

      console.error("[DBS] Revoke mandate error:", errData || error.message);

      // ─────────────────────────────────────────────────────────────
      // 6. Map known DBS error codes to friendly messages
      // ─────────────────────────────────────────────────────────────
      const errorMap = {
        MANDATE_NOT_FOUND: "Mandate not found at DBS.",
        INVALID_STATUS_CHANGE: `Cannot revoke mandate: current status is ${mandate.status}.`,
        MANDATE_NOT_ACTIVE: "Only ACTIVE mandates can be revoked.",
        MANDATE_ALREADY_REVOKED: "Mandate is already revoked.",
        MANDATE_EXPIRED: "Cannot revoke an expired mandate.",
        GATEWAY_REVOKE_FAILED: "The bank's gateway refused to revoke this mandate.",
      };

      const errCode =
        errData.error_code || errData.code || errData.mandate_status || null;

      const friendlyMessage =
        errorMap[errCode] ||
        errData.message ||
        errData.error_message ||
        "Failed to revoke mandate.";

      throw new functions.https.HttpsError(
        resp?.status === 404 ? "not-found" : "internal",
        friendlyMessage,
        { errorCode: errCode || null }
      );
    }
  });

exports.stopJuspayMandateExecution = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { mandateId, orderId } = data || {};
    if (!mandateId || !orderId) {
      throw new functions.https.HttpsError("invalid-argument", "mandateId and orderId are required.");
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Load the debit record from Firestore
    // ─────────────────────────────────────────────────────────────
    const debitsRef = admin.firestore().collection("mandateDebits");
    const debitQuery = await debitsRef
      .where("orderId", "==", String(orderId))
      .where("mandateId", "==", String(mandateId))
      .limit(1)
      .get();

    if (debitQuery.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        "Debit record not found. The order_id may be invalid."
      );
    }

    const debitDoc = debitQuery.docs[0];
    const debit = debitDoc.data();

    // ─────────────────────────────────────────────────────────────
    // 2. Validate the debit is still cancellable
    // ─────────────────────────────────────────────────────────────
    if (["CHARGED", "FAILED", "CANCELLED"].includes(debit.status)) {
      return {
        success: false,
        order_id: orderId,
        mandate_id: mandateId,
        status: debit.status,
        message: `Cannot cancel: debit is already ${debit.status}.`,
        alreadyTerminal: true,
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Enforce the 30-minute window (per DBS spec)
    //    Execution must be stopped at least 30 minutes before
    //    the scheduled execution time.
    // ─────────────────────────────────────────────────────────────
    const mandateSnap = await admin.firestore().collection("mandates").doc(mandateId).get();
    if (mandateSnap.exists) {
      const m = mandateSnap.data();
      const executionEpoch = Number(m.nextDebitAt?.seconds || 0);
      if (executionEpoch > 0) {
        const minutesUntilExecution = (executionEpoch * 1000 - Date.now()) / 60000;
        if (minutesUntilExecution < 30) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `Cannot stop execution: less than 30 minutes until scheduled debit. ` +
            `Debit will proceed unless cancelled earlier.`
          );
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Build form-encoded body
    // ─────────────────────────────────────────────────────────────
    const formBody = new URLSearchParams();
    formBody.append("command", "cancel_recurring_transaction");
    formBody.append("order_id", String(orderId));

    try {
      const response = await axios.post(
        getJuspayMandateEndpoint(mandateId),
        formBody.toString(),
        {
          headers: {
            Authorization: getDbsAuthHeader(),
            "x-merchantid": merchantId,
            "x-routing-id": debit.customerId || context.auth.uid,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 20000,
        }
      );

      const payload = response.data || {};

      // ─────────────────────────────────────────────────────────────
      // 5. Parse response — spec uses txn_status, not status
      // ─────────────────────────────────────────────────────────────
      const txnStatus = String(payload.txn_status || payload.status || "").toUpperCase();
      const txnUuid = payload.txn_uuid || null;
      const responseMessage = payload.response_message || null;
      const bankErrorCode = payload.bank_error_code || null;

      console.log("[DBS] Stop mandate execution response:", {
        mandate_id: mandateId,
        order_id: orderId,
        txn_status: txnStatus,
        txn_uuid: txnUuid,
        bank_error_code: bankErrorCode,
        response_message: responseMessage,
      });

      // ─────────────────────────────────────────────────────────────
      // 6. Determine success based on JUSPAY_DECLINED status
      //    (spec: "the order moves to JUSPAY_DECLINED with bank_error_code JP_852")
      // ─────────────────────────────────────────────────────────────
      const isSuccess =
        txnStatus === "JUSPAY_DECLINED" ||
        bankErrorCode === "JP_852" ||
        (responseMessage || "").toLowerCase().includes("successfully terminated");

      const now = admin.firestore.FieldValue.serverTimestamp();

      if (isSuccess) {
        await debitDoc.ref.set(
          {
            status: "CANCELLED",
            cancelledAt: now,
            cancelReason: "STOPPED_BEFORE_EXECUTION",
            txnStatus,
            txnUuid,
            bankErrorCode,
            responseMessage,
            rawStopResponse: payload,
          },
          { merge: true }
        );

        console.log(`[DBS] Mandate execution stopped: order ${orderId} for mandate ${mandateId}`);

        return {
          success: true,
          mandate_id: mandateId,
          order_id: orderId,
          txn_status: txnStatus,
          txn_uuid: txnUuid,
          bank_error_code: bankErrorCode,
          message: responseMessage || "Transaction successfully terminated.",
          raw: payload,
        };
      }

      // Cancellation didn't take effect
      await debitDoc.ref.set(
        {
          lastStopAttemptAt: now,
          lastStopAttemptFailed: true,
          lastStopAttemptReason: responseMessage || txnStatus,
          rawStopResponse: payload,
        },
        { merge: true }
      );

      return {
        success: false,
        mandate_id: mandateId,
        order_id: orderId,
        txn_status: txnStatus,
        message:
          responseMessage ||
          "The mandate execution could not be stopped. It may have already been processed.",
        raw: payload,
      };
    } catch (error) {
      const resp = error.response;
      const errData = resp?.data || {};

      console.error("[DBS] Stop mandate execution error:", errData || error.message);

      const errorMap = {
        MANDATE_NOT_FOUND: "Mandate not found at DBS.",
        ORDER_NOT_FOUND: "Debit order not found. The order_id may be invalid.",
        CANNOT_CANCEL_PROCESSED_ORDER: "Debit has already been processed and cannot be cancelled.",
        CANNOT_CANCEL_WITHIN_30_MIN: "Too late to cancel — less than 30 minutes until debit.",
        INVALID_STATUS_CHANGE: "Debit is not in a cancellable state.",
      };

      const errCode = errData.error_code || errData.code;
      const friendlyMessage =
        errorMap[errCode] ||
        errData.message ||
        errData.error_message ||
        "Failed to stop mandate execution.";

      throw new functions.https.HttpsError(
        resp?.status === 404 ? "not-found" : "internal",
        friendlyMessage,
        { errorCode: errCode || null }
      );
    }
  });

exports.listJuspayOffers = functions.region("asia-south1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { orderId, customerId = context.auth.uid, amount, currency = "INR", offerCode } = data || {};
  const merchantId = process.env.JUSPAY_MERCHANT_ID;
  const apiKey = process.env.JUSPAY_API_KEY;
  if (!merchantId || !apiKey) throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");
  try {
    const queryParams = {
      merchant_id: merchantId, customer_id: customerId, currency,
      ...(orderId ? { order_id: orderId } : {}),
      ...(amount !== undefined && amount !== null ? { amount: String(amount) } : {}),
      ...(offerCode ? { offer_code: offerCode } : {}),
    };
    const response = await axios.get(getJuspayOffersEndpoint(queryParams), {
      headers: {
        Authorization: getDbsAuthHeader(), "x-merchantid": merchantId,
        "x-routing-id": customerId, "Content-Type": "application/x-www-form-urlencoded", version: "2023-06-30",
      },
      timeout: 20000,
    });
    return response.data;
  } catch (error) {
    console.error("Juspay list offers error:", error.response?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to list Juspay offers.");
  }
});

exports.getJuspayOrderStatusWithOffers = functions
  .runWith({ secrets: [JUSPAY_MERCHANT_PRIVATE_KEY, JUSPAY_PUBLIC_KEY] })
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    const { orderId } = data || {};
    if (!orderId) throw new functions.https.HttpsError("invalid-argument", "orderId is required.");
    const session = await admin.firestore().collection("juspaySessions").doc(orderId).get();
    if (!session.exists || session.data().userId !== context.auth.uid) {
      throw new functions.https.HttpsError("permission-denied", "Order does not belong to the current user.");
    }
    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey || !JUSPAY_MERCHANT_PRIVATE_KEY.value() || !JUSPAY_PUBLIC_KEY.value()) {
      throw new functions.https.HttpsError("failed-precondition", "DBS API credentials and verification keys must be configured.");
    }
    try {
      const response = await axios.get(`${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
        headers: {
          Authorization: getDbsAuthHeader(), "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid, "Content-Type": "application/x-www-form-urlencoded", version: "2023-06-30",
        },
        timeout: 20000,
      });
      const payload = typeof response.data === "string"
        ? decryptAndVerifyJuspayStatus(response.data, JUSPAY_MERCHANT_PRIVATE_KEY.value(), JUSPAY_PUBLIC_KEY.value())
        : response.data;
      if (payload.mandate && payload.mandate.mandate_id) {
        try {
          await saveMandateFromPayload(payload.mandate, { customerId: context.auth.uid, orderId: String(orderId) });
        } catch (err) {
          console.error("[DBS] Mandate persist failed:", err.message);
        }
      }
      return {
        orderId,
        status: String(payload.status || "").toUpperCase(),
        status_id: payload.status_id || null,
        offers: payload.offers || payload.offer_details || payload.offer || [],
        mandate: payload.mandate || null, raw: payload,
      };
    } catch (error) {
      console.error("DBS order status with offers error:", error.response?.data || error.message);
      throw new functions.https.HttpsError("internal", "Failed to retrieve DBS order status with offer details.");
    }
  });

// ==========================================
// 🚀 CANCEL / REFUND
// ==========================================
exports.cancelJuspayOrder = functions.region("asia-south1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { orderId, reason = "customer_cancelled" } = data || {};
  if (!orderId) throw new functions.https.HttpsError("invalid-argument", "orderId is required.");
  const session = await admin.firestore().collection("juspaySessions").doc(String(orderId)).get();
  if (!session.exists || session.data().userId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Order does not belong to the current user.");
  }
  const merchantId = process.env.JUSPAY_MERCHANT_ID;
  const apiKey = process.env.JUSPAY_API_KEY;
  if (!merchantId || !apiKey) throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");
  try {
    const cancelUrl = `${getDbsOrderStatusBaseUrl()}/merchants/${merchantId}/order/${encodeURIComponent(orderId)}/cancel`;
    const response = await axios.post(cancelUrl, { cancel_reason: reason }, {
      headers: {
        Authorization: getDbsAuthHeader(), "x-merchantid": merchantId,
        "x-routing-id": context.auth.uid, "Content-Type": "application/json", version: "2023-06-30",
      },
      timeout: 20000,
    });
    await admin.firestore().collection("juspaySessions").doc(String(orderId)).update({
      status: "CANCELLED",
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
      orderId,
      status: response.data?.status || "CANCELLED",
      message: response.data?.message || "Order cancelled successfully.",
    };
  } catch (error) {
    const resp = error.response;
    if (resp && [400, 404, 409].includes(resp.status)) {
      return { orderId, status: "NotCancellable", message: resp.data?.message || "Order is not in ACTIVE state." };
    }
    console.error("Juspay cancel error:", resp?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to cancel Juspay order.");
  }
});

exports.refundJuspayOrder = functions.region("asia-south1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { orderId, amount, reason = "customer_refund" } = data || {};
  if (!orderId) throw new functions.https.HttpsError("invalid-argument", "orderId is required.");
  const session = await admin.firestore().collection("juspaySessions").doc(String(orderId)).get();
  if (!session.exists || session.data().userId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Order does not belong to the current user.");
  }
  const merchantId = process.env.JUSPAY_MERCHANT_ID;
  const apiKey = process.env.JUSPAY_API_KEY;
  if (!merchantId || !apiKey) throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");
  try {
    const refundUrl = `${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(orderId)}/refunds`;
    const uniqueRequestId = `RF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`.slice(0, 20);
    const formBody = new URLSearchParams();
    formBody.append("unique_request_id", uniqueRequestId);
    if (amount !== undefined && amount !== null) formBody.append("amount", Number(amount).toFixed(2));
    formBody.append("metaData", JSON.stringify({ description: reason }));
    const response = await axios.post(refundUrl, formBody.toString(), {
      headers: {
        Authorization: getDbsAuthHeader(), "x-merchantid": merchantId,
        "x-routing-id": context.auth.uid, "Content-Type": "application/x-www-form-urlencoded", version: "2023-06-30",
      },
      timeout: 20000,
    });
    await admin.firestore().collection("juspaySessions").doc(String(orderId)).update({
      status: "REFUND_REQUESTED",
      refundRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
      orderId,
      status: response.data?.refunds?.[0]?.status || "PENDING",
      message: "Refund initiated successfully.", payload: response.data,
    };
  } catch (error) {
    const resp = error.response;
    if (resp && resp.data?.error_code) {
      return { orderId, status: "FAILED", message: resp.data.message || "Refund failed.", error_code: resp.data.error_code };
    }
    console.error("Juspay refund error:", resp?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to refund Juspay order.");
  }
});

// ==========================================
// 🚀 DBS: ORDER STATUS
// ==========================================
exports.getJuspayOrderStatus = functions
  .runWith({ secrets: [JUSPAY_MERCHANT_PRIVATE_KEY, JUSPAY_PUBLIC_KEY] })
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    const { orderId } = data || {};
    if (!orderId) throw new functions.https.HttpsError("invalid-argument", "orderId is required.");
    const session = await admin.firestore().collection("juspaySessions").doc(orderId).get();
    if (!session.exists || session.data().userId !== context.auth.uid) {
      throw new functions.https.HttpsError("permission-denied", "Order does not belong to the current user.");
    }
    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey || !JUSPAY_MERCHANT_PRIVATE_KEY.value() || !JUSPAY_PUBLIC_KEY.value()) {
      throw new functions.https.HttpsError("failed-precondition", "DBS API credentials and verification keys must be configured.");
    }
    try {
      const response = await retryWithBackoff(
        () => axios.get(`${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
          headers: {
            Authorization: getDbsAuthHeader(), "x-merchantid": merchantId,
            "x-routing-id": context.auth.uid, "Content-Type": "application/x-www-form-urlencoded", version: "2023-06-30",
          },
          timeout: 20000,
        }),
        "DBS-Status"
      );
      const payload = typeof response.data === "string"
        ? decryptAndVerifyJuspayStatus(response.data, JUSPAY_MERCHANT_PRIVATE_KEY.value(), JUSPAY_PUBLIC_KEY.value())
        : response.data;
      const status = String(payload.status || "").toUpperCase();
      let sessionData = session.data();
      const isCharged = status === "CHARGED" || Number(payload.status_id) === 21;
      if (isCharged) {
        sessionData = await markJuspayOrderCharged(
          orderId,
          payload.txn_detail?.txn_id || payload.txn_id || null,
          payload.amount ?? payload.effective_amount ?? payload.txn_detail?.txn_amount,
          payload.currency || payload.txn_detail?.currency || "INR",
          payload.mandate || null
        );
      }
      return {
        status,
        status_id: payload.status_id || null,
        mandate: payload.mandate || null,
        session: sessionData ? {
          type: sessionData.type,
          referenceId: sessionData.referenceId,
          planTier: sessionData.planTier || null,
          subscriptionExpiry: sessionData.subscriptionExpiry || null,
          mandateId: sessionData.mandateId || null,
          mandateStatus: sessionData.mandateStatus || null,
          mandateFrequency: sessionData.mandateFrequency || null,
          mandateRuleValue: sessionData.mandateRuleValue || null,
        } : null,
      };
    } catch (error) {
      console.error("DBS status error:", error.response?.data || error.message);
      throw new functions.https.HttpsError("internal", "Failed to retrieve DBS order status.");
    }
  });

// ==========================================
// 🚀 DBS: WEBHOOK
// ==========================================
exports.juspayWebhook = functions.region("asia-south1").https.onRequest(async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const expectedUsername = process.env.JUSPAY_WEBHOOK_USERNAME;
  const expectedPassword = process.env.JUSPAY_WEBHOOK_PASSWORD;
  const authorization = req.headers.authorization || "";
  const expectedAuthorization =
    expectedUsername && expectedPassword
      ? `Basic ${Buffer.from(`${expectedUsername}:${expectedPassword}`).toString("base64")}`
      : null;
  if (!expectedAuthorization || authorization !== expectedAuthorization) {
    return res.status(401).send("Unauthorized");
  }
  try {
    const payload = req.body || {};
    const eventName = payload.event_name || "";
    const orderId = payload.order_id || payload.order?.order_id || payload.content?.order?.order_id;
    const status = String(payload.status || payload.order?.status || payload.content?.order?.status || "").toUpperCase();
    const eventId = payload.id || payload.event_id ||
      `${orderId || "unknown"}:${eventName || status}:${payload.txn_detail?.txn_id || payload.txn_id || payload.status_id || Date.now()}`;
    const eventRef = admin.firestore().collection("juspayWebhookEvents").doc(String(eventId));
    const eventSnap = await eventRef.get();
    if (eventSnap.exists) return res.status(200).send("OK");

        if (MANDATE_WEBHOOK_TO_STATUS[eventName]) {
      const mandateData = payload.content?.mandate || payload.mandate || {};
      const mandateId = mandateData.mandate_id || payload.mandate_id;

      if (mandateId) {
        // Extract pause-related fields if this is a PAUSED webhook
        const pauseStartDate = mandateData.pause_start_date || null;
        const pauseEndDate = mandateData.pause_end_date || null;

        await saveMandateFromPayload(mandateData, {
          status: MANDATE_WEBHOOK_TO_STATUS[eventName],
          lastWebhookEvent: eventName,
          lastWebhookAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(pauseStartDate ? { pauseStartDate } : {}),
          ...(pauseEndDate ? { pauseEndDate } : {}),
          ...(eventName === "MANDATE_PAUSED"
            ? { pausedAt: admin.firestore.FieldValue.serverTimestamp() }
            : {}),
        });

        // Sync user profile flags based on mandate status change
        if (mandateData.customer_id) {
          const userRef = admin.firestore().collection("users").doc(String(mandateData.customer_id));
          const newStatus = MANDATE_WEBHOOK_TO_STATUS[eventName];

          if (eventName === "MANDATE_PAUSED") {
            await userRef.set(
              {
                autoRenewPaused: true,
                autoRenewPauseEndDate: pauseEndDate,
                autoRenewPausedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          } else if (eventName === "MANDATE_ACTIVATED") {
            // Resume from pause OR fresh activation
            await userRef.set(
              {
                autoRenewEnabled: true,
                autoRenewPaused: false,
                autoRenewPauseEndDate: null,
              },
              { merge: true }
            );
          } else if (
            newStatus === MANDATE_STATUS.REVOKED ||
            newStatus === MANDATE_STATUS.EXPIRED ||
            newStatus === MANDATE_STATUS.FAILURE
          ) {
            await userRef.set(
              {
                autoRenewEnabled: false,
                autoRenewPaused: false,
                autoRenewDisabledReason: newStatus,
                autoRenewDisabledAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          }
        }
        if (mandateData.order_id) {
          await admin.firestore().collection("juspaySessions").doc(String(mandateData.order_id)).set({
            mandateId: String(mandateId),
            mandateStatus: MANDATE_WEBHOOK_TO_STATUS[eventName],
            mandatePending: false,
            ...(MANDATE_WEBHOOK_TO_STATUS[eventName] === MANDATE_STATUS.ACTIVE
              ? { mandateActivatedAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
          }, { merge: true });
        }
        console.log(`[DBS] Mandate ${mandateId} → ${MANDATE_WEBHOOK_TO_STATUS[eventName]} (${eventName})`);
      }
    }

        if (eventName === "NOTIFICATION_SUCCEEDED" || eventName === "NOTIFICATION_FAILED") {
      const notification = payload.content?.notification || payload.notification || {};
      const mandateId = notification.mandate?.mandate_id || notification.mandate_id;
      const notifStatus = eventName === "NOTIFICATION_SUCCEEDED" ? "SUCCESS" : "FAILED";
      const debitOrderId = notification.source_info?.order_id || notification.order_id;

      if (mandateId) {
        const debitsRef = admin.firestore().collection("mandateDebits");

        // Find the most recent pending debit for this mandate
        const q = debitsRef
          .where("mandateId", "==", mandateId)
          .where("notificationStatus", "==", "PENDING")
          .orderBy("createdAt", "desc")
          .limit(1);
        const snap = await q.get();
        let debitDocRef = null;
        let debitDocData = null;
        if (!snap.empty) {
          debitDocRef = snap.docs[0].ref;
          debitDocData = snap.docs[0].data();
          await debitDocRef.update({
            notificationStatus: notifStatus,
            notificationUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            notificationPayload: notification,
          });
        }

        console.log(`[DBS] Notification for mandate ${mandateId}: ${notifStatus}`);

        // ─────────────────────────────────────────────────────────────
        // ✅ Auto-retry logic per DBS spec:
        //    "Failed mandates can be retried up to two times;
        //     if retries also fail, execution must be redone with a
        //     fresh pre-debit notification."
        // ─────────────────────────────────────────────────────────────
        if (notifStatus === "FAILED") {
          const currentRetry = (debitDocData?.retryCount || 0);

          if (currentRetry < 2) {
            // Retry with a NEW order_id
            console.warn(
              `[DBS] NOTIFICATION_FAILED for mandate ${mandateId}. ` +
              `Auto-retry ${currentRetry + 1}/2 with a fresh order_id.`
            );

            const mandateSnap = await admin.firestore().collection("mandates").doc(mandateId).get();
            if (!mandateSnap.exists) {
              console.error(`[DBS] Cannot retry: mandate ${mandateId} not found.`);
            } else {
              const m = mandateSnap.data();
              const merchantId = process.env.JUSPAY_MERCHANT_ID;
              const apiKey = process.env.JUSPAY_API_KEY;

              if (merchantId && apiKey && m.status === MANDATE_STATUS.ACTIVE) {
                const retryOrderId = `dbt${Date.now().toString(36)}${crypto
                  .randomBytes(3)
                  .toString("hex")}`.slice(0, 21);
                const retryAmount = debitDocData?.amount || m.maxAmount || 0;

                const retryForm = new URLSearchParams();
                retryForm.append("order.order_id", retryOrderId);
                retryForm.append("order.amount", String(retryAmount));
                retryForm.append("order.customer_id", String(m.customerId));
                retryForm.append("merchant_id", String(merchantId));
                retryForm.append("mandate_id", String(mandateId));
                retryForm.append("format", "json");

                try {
                  const retryResp = await axios.post(
                    `${getDbsOrderStatusBaseUrl()}/txns`,
                    retryForm.toString(),
                    {
                      headers: {
                        Authorization: getDbsAuthHeader(),
                        "x-merchantid": merchantId,
                        "x-routing-id": m.customerId || mandateId,
                        "Content-Type": "application/x-www-form-urlencoded",
                      },
                      timeout: 30000,
                    }
                  );

                  const retryPayload = retryResp.data || {};
                  const retryStatus = String(retryPayload.status || "").toUpperCase();

                  await admin.firestore().collection("mandateDebits").add({
                    mandateId,
                    orderId: retryOrderId,
                    amount: retryAmount,
                    customerId: m.customerId,
                    status: retryStatus || "PENDING",
                    txnId: retryPayload.txn_id || null,
                    txnUuid: retryPayload.txn_uuid || null,
                    authenticationUrl: retryPayload.payment?.authentication?.url || null,
                    source: "AUTO_RETRY",
                    retryCount: currentRetry + 1,
                    notificationStatus: "PENDING",
                    parentOrderId: debitOrderId,
                    rawResponse: retryPayload,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  });

                  // Mark the failed debit as retried
                  if (debitDocRef) {
                    await debitDocRef.update({
                      retriedAs: retryOrderId,
                      retryCount: currentRetry + 1,
                    });
                  }

                  console.log(
                    `[DBS] Retry ${currentRetry + 1}/2 accepted for mandate ${mandateId} ` +
                    `→ new order ${retryOrderId}`
                  );
                } catch (retryErr) {
                  console.error(
                    `[DBS] Retry ${currentRetry + 1}/2 failed for mandate ${mandateId}:`,
                    retryErr.response?.data || retryErr.message
                  );
                  await admin.firestore().collection("mandateDebits").add({
                    mandateId,
                    orderId: retryOrderId,
                    amount: retryAmount,
                    customerId: m.customerId,
                    status: "FAILED",
                    source: "AUTO_RETRY",
                    retryCount: currentRetry + 1,
                    error: retryErr.response?.data || { message: retryErr.message },
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                }
              }
            }
          } else {
            // Both retries exhausted — flag for manual intervention
            console.error(
              `[DBS] Mandate ${mandateId} exhausted 2 retries. ` +
              `Requires fresh pre-debit notification. Flagging for manual review.`
            );
            await admin.firestore().collection("mandateDebits").add({
              mandateId,
              orderId: debitOrderId ? String(debitOrderId) + "_exhausted" : null,
              notificationStatus: "EXHAUSTED",
              reason: "MAX_RETRIES_EXCEEDED",
              originalOrderId: debitOrderId,
              requiresManualIntervention: true,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      }
    }

    if (status === "CHARGED" || Number(payload.status_id) === 21) {
      const mandateBlock = payload.mandate || payload.content?.mandate || payload.order?.mandate || null;
      const updatedSession = await markJuspayOrderCharged(
        orderId,
        payload.txn_detail?.txn_id || payload.txn_id || payload.payment?.txn_id || null,
        payload.amount ?? payload.effective_amount ?? payload.txn_detail?.txn_amount,
        payload.currency || payload.txn_detail?.currency || "INR",
        mandateBlock
      );
      if (!updatedSession) console.warn(`[DBS] CHARGED webhook for unknown session ${orderId}`);
    }

    await admin.firestore().runTransaction(async (transaction) => {
      const existingEvent = await transaction.get(eventRef);
      if (!existingEvent.exists) {
        transaction.set(eventRef, {
          orderId: orderId || null, eventName: eventName || null, status,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(), payload,
        });
      }
    });

    return res.status(200).send("OK");
  } catch (error) {
    console.error("DBS webhook error:", error.message);
    return res.status(500).send("Webhook processing failed");
  }
});

// ==========================================
// 🚀 DBS: RETURN URL
// ==========================================
exports.juspayReturn = functions
  .runWith({ secrets: [JUSPAY_MERCHANT_PRIVATE_KEY, JUSPAY_PUBLIC_KEY] })
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
    const orderId = req.query.order_id;
    if (!orderId) return res.status(400).send("Missing order_id");
    try {
      const sessionRef = admin.firestore().collection("juspaySessions").doc(String(orderId));
      const sessionSnap = await sessionRef.get();
      if (!sessionSnap.exists) return res.status(404).send("Payment session not found");
      let sessionData = sessionSnap.data();
      const apiKey = process.env.JUSPAY_API_KEY;
      const merchantId = process.env.JUSPAY_MERCHANT_ID;
      const merchantPrivateKey = JUSPAY_MERCHANT_PRIVATE_KEY.value();
      const juspayPublicKey = JUSPAY_PUBLIC_KEY.value();
      if (!apiKey || !merchantId || !merchantPrivateKey || !juspayPublicKey) {
        return res.status(503).send("DBS verification is not configured");
      }
      const statusResponse = await axios.get(`${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
        headers: {
          Authorization: getDbsAuthHeader(), "x-merchantid": merchantId,
          "Content-Type": "application/x-www-form-urlencoded", version: "2023-06-30",
        },
        timeout: 20000,
      });
      const statusPayload = typeof statusResponse.data === "string"
        ? decryptAndVerifyJuspayStatus(statusResponse.data, merchantPrivateKey, juspayPublicKey)
        : statusResponse.data;
      const status = String(statusPayload.status || "").toUpperCase();
      const isCharged = status === "CHARGED" || Number(statusPayload.status_id) === 21;
      if (isCharged) {
        sessionData = await markJuspayOrderCharged(
          orderId,
          statusPayload.txn_detail?.txn_id || statusPayload.txn_id || null,
          statusPayload.amount ?? statusPayload.effective_amount ?? statusPayload.txn_detail?.txn_amount,
          statusPayload.currency || statusPayload.txn_detail?.currency || "INR",
          statusPayload.mandate || null
        );
      }
      const title = isCharged ? "Payment successful" : `Payment status: ${status || "PENDING"}`;
      const message =
        isCharged && (sessionData?.type === "subscription" || sessionData?.type === "subscription_autopay")
          ? "Your Prochem subscription is now active."
          : isCharged ? "Your order is being placed."
          : "You can return to Prochem and check the payment status again.";
      return res.status(200).send(
        `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prochem Payment</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:48px 20px;color:#1e293b}h2{color:${isCharged ? "#15803d" : "#b45309"}}</style></head><body><h2>${title}</h2><p>${message}</p><p>This window will close automatically in <span id="countdown">3</span> seconds.</p><script>let n=3;const el=document.getElementById('countdown');const t=setInterval(()=>{n--;el.textContent=n;if(n<=0){clearInterval(t);window.close();}},1000);</script></body></html>`
      );
    } catch (error) {
      console.error("DBS return error:", error.message);
      return res.status(500).send("Unable to verify payment");
    }
  });

// ==========================================
// 🚀 SCHEDULED MANDATE AUTO-DEBIT RUNNER
// ==========================================
exports.runMandateAutoDebits = onSchedule(
  {
    schedule: "30 0 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async (event) => {
    const db = admin.firestore();
    const now = Date.now();
    const windowStart = now + 25 * 3600 * 1000;   // 25 hours from now
    const windowEnd   = now + 49 * 3600 * 1000;   // 49 hours from now

    console.log(
      `[Mandate-Scheduler] Scanning for mandates due between ` +
      `${new Date(windowStart).toISOString()} and ${new Date(windowEnd).toISOString()}`
    );

    const mandatesSnap = await db
      .collection("mandates")
      .where("status", "==", MANDATE_STATUS.ACTIVE)
      .get();

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      console.error("[Mandate-Scheduler] Juspay credentials not configured.");
      return;
    }

    let executedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const doc of mandatesSnap.docs) {
      const m = doc.data();
      const mandateId = m.mandateId || doc.id;

      // ─── Skip if mandate expired ───
      if (m.endDate && Number(m.endDate) * 1000 < now) {
        console.log(`[Mandate-Scheduler] Skipping ${mandateId}: mandate expired.`);
        skippedCount++;
        continue;
      }

      // ─── Check if this mandate is due ───
      const nextDebitAt =
        m.nextDebitAt?.toMillis?.() ||
        (m.nextDebitAt?.seconds ? m.nextDebitAt.seconds * 1000 : null) ||
        null;

      if (!nextDebitAt || nextDebitAt < windowStart || nextDebitAt > windowEnd) {
        skippedCount++;
        continue;
      }

      // ─── Skip if a debit is already in flight ───
      const existingDebit = await db
        .collection("mandateDebits")
        .where("mandateId", "==", mandateId)
        .where("status", "in", ["PENDING", "PENDING_VBV", "AUTHORIZING"])
        .limit(1)
        .get();

      if (!existingDebit.empty) {
        console.log(`[Mandate-Scheduler] Skipping ${mandateId}: debit already in flight.`);
        skippedCount++;
        continue;
      }

      // ─── Generate a fresh unique order_id ───
      const debitOrderId = `dbt${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`.slice(0, 21);
      const amount = m.maxAmount || m.renewalAmount || 0;

      if (!amount || amount < 1) {
        console.warn(`[Mandate-Scheduler] Skipping ${mandateId}: no valid amount.`);
        skippedCount++;
        continue;
      }

      // ─── Build form-encoded body ───
      const formBody = new URLSearchParams();
      formBody.append("order.order_id", debitOrderId);
      formBody.append("order.amount", String(amount));
      formBody.append("order.customer_id", String(m.customerId));
      formBody.append("merchant_id", String(merchantId));
      formBody.append("mandate_id", String(mandateId));
      formBody.append("format", "json");

      // Optional: if DBS-managed notifications, set execution_date = nextDebitAt
      if (m.usesDbsManagedNotification === true) {
        const execEpoch = Math.floor(nextDebitAt / 1000);
        formBody.append("mandate.execution_date", String(execEpoch));
      }

      try {
        const response = await axios.post(
          `${getDbsOrderStatusBaseUrl()}/txns`,
          formBody.toString(),
          {
            headers: {
              Authorization: getDbsAuthHeader(),
              "x-merchantid": merchantId,
              "x-routing-id": m.customerId || mandateId,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 30000,
          }
        );

        const payload = response.data || {};
        const status = String(payload.status || "").toUpperCase();
        const authenticationUrl = payload.payment?.authentication?.url || null;

        await db.collection("mandateDebits").add({
          mandateId,
          orderId: debitOrderId,
          amount,
          customerId: m.customerId,
          status: status || "PENDING",
          txnId: payload.txn_id || null,
          txnUuid: payload.txn_uuid || null,
          authenticationUrl,
          source: "AUTO_SCHEDULER",
          retryCount: 0,
          notificationStatus: "PENDING",
          rawResponse: payload,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Advance the mandate's next debit date
        const nextDebit = computeNextDebitAt(
          m.frequency,
          m.ruleValue,
          m.ruleType,
          new Date(now)
        );

        await doc.ref.update({
          lastDebitAt: admin.firestore.FieldValue.serverTimestamp(),
          lastDebitOrderId: debitOrderId,
          lastDebitAmount: amount,
          nextDebitAt: nextDebit,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        executedCount++;
        console.log(
          `[Mandate-Scheduler] Executed mandate ${mandateId} → order ${debitOrderId}, ` +
          `amount ₹${amount}, status ${status}`
        );
      } catch (err) {
        failedCount++;
        console.error(
          `[Mandate-Scheduler] Execution failed for ${mandateId}:`,
          err.response?.data || err.message
        );

        await db.collection("mandateDebits").add({
          mandateId,
          orderId: debitOrderId,
          amount,
          customerId: m.customerId,
          status: "FAILED",
          source: "AUTO_SCHEDULER",
          retryCount: 0,
          error: err.response?.data || { message: err.message },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    console.log(
      `[Mandate-Scheduler] Complete. Executed: ${executedCount}, ` +
      `Skipped: ${skippedCount}, Failed: ${failedCount}`
    );
  }
);

// Alias for client compatibility — CheckoutScreen calls `createDBSSession`
exports.createDBSSession = exports.createJuspaySession;
exports.getDBSOrderStatus  = exports.getJuspayOrderStatus;