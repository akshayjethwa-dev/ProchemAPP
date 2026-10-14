// File: functions/index.js
const functions = require("firebase-functions/v1");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const crypto = require("crypto");
const axios = require("axios");

// ---------------------------------------------------------------------------
// LAZY-LOAD HEAVY SDKs
// ---------------------------------------------------------------------------
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
// ---------------------------------------------------------------------------
// Priority:
//   1. JUSPAY_BASE_URL  e.g. https://uat-api.dbs.bank.in  or  https://api.dbs.bank.in
//   2. Derive from JUSPAY_API_URL (legacy) e.g. https://uat-api.dbs.bank.in/session
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
  basic: { amount: 2359, tier: "BASIC", durationDays: 30 },
  premium_growth: { amount: 5899, tier: "GROWTH_PACKAGE", durationDays: 30 },
  standard: { amount: 50, tier: "GROWTH_PACKAGE", durationDays: 365 },
  growth: { amount: 100000, tier: "GROWTH_PACKAGE", durationDays: 1095 },
};

// ---------------------------------------------------------------------------
// Auth + retry + structured error parsing
// ---------------------------------------------------------------------------
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
      console.warn(
        `[${label}] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms (HTTP ${status})`
      );
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
  const errorCode = body.error_code || body.errorCode || body.code || null;
  const subCode = body.sub_code || body.subCode || body.details?.sub_code || body.details?.error_code || null;
  const dbsMessage = body.message || body.error || body.error_description || body.description || null;
  const key = subCode || errorCode;
  const info = SESSION_ERROR_INFO[key] || {
    message: dbsMessage || "Payment gateway returned an unexpected error.",
    retryable: RETRYABLE_STATUSES.includes(resp.status),
    userAction: RETRYABLE_STATUSES.includes(resp.status) ? "retry" : "contact_support",
  };
  return {
    httpStatus: resp.status,
    errorCode: errorCode || `HTTP_${resp.status}`,
    subCode,
    message: dbsMessage || info.message,
    retryable: info.retryable,
    userAction: info.userAction,
    raw: body,
  };
}

// ---------------------------------------------------------------------------
// Idempotent order fulfillment (kept from original)
// ---------------------------------------------------------------------------
const markJuspayOrderCharged = async (orderId, transactionId, chargedAmount, currency) => {
  const db = admin.firestore();
  const sessionRef = db.collection("juspaySessions").doc(String(orderId));

  return db.runTransaction(async (transaction) => {
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
    if (session.type === "subscription") {
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
      session.type === "subscription" && session.subscriptionDurationDays
        ? new Date(paidAt.getTime() + session.subscriptionDurationDays * 86400000).toISOString()
        : null;

    transaction.update(sessionRef, {
      status: "CHARGED",
      transactionId: transactionId || null,
      ...(subscriptionExpiry ? { subscriptionExpiry } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (session.type === "subscription") {
      transaction.update(userRef, {
        subscriptionTier: session.planTier,
        subscriptionPlan: session.referenceId,
        subscriptionExpiry,
        subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
};

// ---------------------------------------------------------------------------
// JWE / JWS decrypt+verify (unchanged)
// ---------------------------------------------------------------------------
const base64UrlToBuffer = (value) => Buffer.from(value, "base64url");

const decryptAndVerifyJuspayStatus = (
  encryptedResponse,
  merchantPrivateKeyPem,
  juspayPublicKeyPem
) => {
  const token =
    typeof encryptedResponse === "string"
      ? encryptedResponse
      : encryptedResponse?.header &&
        encryptedResponse?.encryptedKey &&
        encryptedResponse?.iv &&
        encryptedResponse?.encryptedPayload &&
        encryptedResponse?.tag
      ? [
          encryptedResponse.header,
          encryptedResponse.encryptedKey,
          encryptedResponse.iv,
          encryptedResponse.encryptedPayload,
          encryptedResponse.tag,
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
        to: pushToken,
        sound: "default",
        title: title || "New Notification",
        body: message || "You have a new message.",
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

        if (userId === buyerId) {
          debugLog += `- Skipped ${userPhone || userId}: This is the buyer.\n`;
        } else if (!hasPhone) {
          debugLog += `- Skipped ${userId}: No phone number on profile.\n`;
        } else if (!hasOptIn) {
          debugLog += `- Skipped ${userPhone}: Opted out of WhatsApp.\n`;
        } else if (!wantsMarketAlerts) {
          debugLog += `- Skipped ${userPhone}: Market alerts disabled.\n`;
        } else if (isExcluded) {
          debugLog += `- Skipped ${userPhone}: Excluded.\n`;
        } else {
          usersToAlert.push({ userId, phoneNumber: userPhone });
          debugLog += `✅ ADDED ${userPhone}.\n`;
        }
      });

      if (usersToAlert.length === 0) {
        await admin.firestore().collection("whatsappLogs").add({
          direction: "outbound",
          toNumber: "SYSTEM_DIAGNOSTIC",
          body: `Broadcast Requirement #${docId} (${productName}) had 0 eligible users.\n\n${debugLog}`,
          templateName: "System_Diagnostic",
          messageType: "debug",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: "failed",
          error: "No eligible users found.",
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
                "1": String(productName),
                "2": String(displayQty),
                "3": String(displayPrice),
                "4": String(docId),
              },
              type: "utility",
              userId: user.userId,
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
            "1": companyName,
            "2": rfqData.productName,
            "3": `${rfqData.targetQuantity} ${rfqData.unit}`,
            "4": String(targetPrice),
            "5": location,
            "6": rfqId,
            "7": deepLink,
          },
          type: "service",
          userId: rfqData.sellerId,
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
// 🚀 INBOUND WHATSAPP WEBHOOK (TWILIO)
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
        direction: "inbound",
        fromNumber: incomingNumber,
        messageSid: WaId,
        body: rawBody,
        senderUserId: senderId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: "received",
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
                    buyerUserId: rfqData.buyerId,
                    sellerUserId: rfqData.sellerId,
                    rfqId: rfqId,
                    status: "open",
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
                await sendWhatsApp(
                  incomingNumber,
                  `✅ Your interest is recorded. Negotiation started for ${rfqData.productName} (RFQ ID: ${rfqId}).\n\n👉 Open App to view: ${deepLink}`,
                  null,
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
          await sendWhatsApp(incomingNumber, `🚫 Direct replies via WhatsApp are not supported.\n\nPlease view and reply to active chats inside the platform.`, null, {
            templateName: "app_redirect_notice",
            templateSid: "HX_APP_REDIRECT_NOTICE_SID",
            type: "service",
            userId: senderId,
          });
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
          let outMsg = "";
          let templateUsed = "";
          let templateSid = "";
          let templateVariables = {};

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
              templateName: templateUsed,
              templateSid,
              templateVariables,
              type: "service",
              userId: targetUserId,
              conversationId,
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
            type: "transactional",
            userId: after.sellerId,
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
          type: "marketing",
          userId,
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
    Cashfree.XEnvironment =
      process.env.CASHFREE_ENVIRONMENT === "PRODUCTION"
        ? Cashfree.Environment.PRODUCTION
        : Cashfree.Environment.SANDBOX;

    const cashfreeOrderId = `cf_${type}_${referenceId}_${Date.now()}`.substring(0, 50);

    const request = {
      order_amount: amount,
      order_currency: "INR",
      order_id: cashfreeOrderId,
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
        cashfreeOrderId,
        paymentStatus: "PENDING_GATEWAY",
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
    Cashfree.XEnvironment =
      process.env.CASHFREE_ENVIRONMENT === "PRODUCTION"
        ? Cashfree.Environment.PRODUCTION
        : Cashfree.Environment.SANDBOX;

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
          userId: customerId,
          type: "SUBSCRIPTION_UPGRADE",
          planId: referenceId,
          cashfreeOrderId: orderData.order_id,
          paymentId: paymentData.cf_payment_id,
          status: "SUCCESS",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await admin.firestore().collection("users").doc(customerId).update({
          subscriptionTier: "GROWTH_PACKAGE",
          subscriptionPlan: referenceId,
          subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (type === "product") {
        await admin.firestore().collection("orders").doc(referenceId).update({
          status: "PENDING_SELLER",
          paymentStatus: "PAID",
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
//    Handles BOTH product + subscription orders
// ==========================================
exports.createJuspaySession = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { type = "product", referenceId, customerDetails } = data || {};
    if (!referenceId || !["product", "subscription"].includes(type)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid payment type and referenceId are required.",
        { errorCode: "invalid_input", subCode: "MISSING_PARAMETER", retryable: false, userAction: "fix_request" }
      );
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const clientId = process.env.JUSPAY_CLIENT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !clientId || !apiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "DBS server credentials are not configured.",
        { errorCode: "internal_error", retryable: false, userAction: "contact_support" }
      );
    }

    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    const returnUrl =
      process.env.JUSPAY_RETURN_URL ||
      (projectId ? `https://asia-south1-${projectId}.cloudfunctions.net/juspayReturn` : null);
    if (!returnUrl || !returnUrl.startsWith("https://")) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "JUSPAY_RETURN_URL must be configured as an HTTPS URL.",
        { errorCode: "internal_error", retryable: false, userAction: "contact_support" }
      );
    }

    let amountInRupees, planTier, subscriptionDurationDays, orderSnapshot;
    if (type === "subscription") {
      const plan = JUSPAY_SUBSCRIPTION_PLANS[referenceId];
      if (!plan) throw new functions.https.HttpsError("invalid-argument", "Unknown subscription plan.");
      amountInRupees = plan.amount;
      planTier = plan.tier;
      subscriptionDurationDays = plan.durationDays;
    } else {
      orderSnapshot = await admin.firestore().collection("orders").doc(referenceId).get();
      if (!orderSnapshot.exists || orderSnapshot.data().buyerId !== context.auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Order does not belong to the current user.");
      }
      amountInRupees = Number(orderSnapshot.data().totalAmount);
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
      action: "paymentPage",
      return_url: returnUrl,
      description: "ProchemAPP Order",
    };

    try {
      const response = await retryWithBackoff(
        () =>
          axios.post(sessionUrl, sessionPayload, {
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
      if (!payload.sdk_payload) {
        throw new Error("DBS did not return a payment session.");
      }

      await admin.firestore().collection("juspaySessions").doc(dbsOrderId).set({
        juspayOrderId: dbsOrderId,
        userId: context.auth.uid,
        type,
        referenceId,
        amount: amountInRupees,
        status: "PENDING",
        ...(planTier ? { planTier, subscriptionDurationDays } : {}),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (type === "product") {
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
      };
    } catch (error) {
      const parsed = parseDbsError(error);
      console.error("[DBS] Session API Error:", parsed);

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
// 🚀 MANDATE APIs (use DBS base URL)
// ==========================================
exports.executeJuspayMandate = functions.region("asia-south1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

  const { mandateId, orderId, amount, customerId = context.auth.uid, currency = "INR", returnUrl = process.env.JUSPAY_RETURN_URL } = data || {};
  if (!mandateId || !orderId) {
    throw new functions.https.HttpsError("invalid-argument", "mandateId and orderId are required.");
  }

  const merchantId = process.env.JUSPAY_MERCHANT_ID;
  const apiKey = process.env.JUSPAY_API_KEY;
  if (!merchantId || !apiKey) {
    throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
  }

  try {
    const response = await axios.post(
      `${getDbsOrderStatusBaseUrl()}/txns`,
      {
        merchant_id: merchantId,
        order: {
          order_id: orderId,
          amount: String(amount ?? 0),
          customer_id: customerId,
          currency,
          return_url: returnUrl,
        },
        mandate_id: mandateId,
      },
      {
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": customerId,
          "Content-Type": "application/json",
          version: "2023-06-30",
        },
        timeout: 20000,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Juspay mandate execution error:", error.response?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to execute Juspay mandate.");
  }
});

exports.listJuspayMandates = functions.region("asia-south1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const customerId = data?.customerId || context.auth.uid;
  const merchantId = process.env.JUSPAY_MERCHANT_ID;
  const apiKey = process.env.JUSPAY_API_KEY;
  if (!merchantId || !apiKey) {
    throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
  }

  try {
    const response = await axios.get(getJuspayCustomerMandatesEndpoint(customerId), {
      headers: {
        Authorization: getDbsAuthHeader(),
        "x-merchantid": merchantId,
        "x-routing-id": customerId,
        "Content-Type": "application/x-www-form-urlencoded",
        version: "2023-06-30",
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
  if (!merchantId || !apiKey) {
    throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
  }

  try {
    const response = await axios.get(
      `${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(lookupOrderId)}`,
      {
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid,
          "Content-Type": "application/x-www-form-urlencoded",
          version: "2023-06-30",
        },
        timeout: 20000,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Juspay mandate status error:", error.response?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to fetch mandate status.");
  }
});

exports.pauseJuspayMandate = functions.region("asia-south1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { mandateId, pauseStartDate, pauseEndDate } = data || {};
  if (!mandateId) throw new functions.https.HttpsError("invalid-argument", "mandateId is required.");

  const merchantId = process.env.JUSPAY_MERCHANT_ID;
  const apiKey = process.env.JUSPAY_API_KEY;
  if (!merchantId || !apiKey) throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");

  try {
    const body = {
      command: "pause",
      pause_start_date: pauseStartDate ?? Math.floor(Date.now() / 1000),
      pause_end_date: pauseEndDate ?? null,
    };
    const response = await axios.post(getJuspayMandateEndpoint(mandateId), new URLSearchParams(body).toString(), {
      headers: {
        Authorization: getDbsAuthHeader(),
        "x-merchantid": merchantId,
        "x-routing-id": context.auth.uid,
        "Content-Type": "application/x-www-form-urlencoded",
        version: "2023-06-30",
      },
      timeout: 20000,
    });
    return response.data;
  } catch (error) {
    console.error("Juspay pause mandate error:", error.response?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to pause Juspay mandate.");
  }
});

exports.revokeJuspayMandate = functions.region("asia-south1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { mandateId, shouldDoImplicitRevoke = false } = data || {};
  if (!mandateId) throw new functions.https.HttpsError("invalid-argument", "mandateId is required.");

  const merchantId = process.env.JUSPAY_MERCHANT_ID;
  const apiKey = process.env.JUSPAY_API_KEY;
  if (!merchantId || !apiKey) throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");

  try {
    const response = await axios.post(
      getJuspayMandateEndpoint(mandateId),
      new URLSearchParams({
        command: "revoke",
        should_do_implicit_revoke: String(shouldDoImplicitRevoke),
      }).toString(),
      {
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid,
          "Content-Type": "application/x-www-form-urlencoded",
          version: "2023-06-30",
        },
        timeout: 20000,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Juspay revoke mandate error:", error.response?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to revoke Juspay mandate.");
  }
});

exports.stopJuspayMandateExecution = functions.region("asia-south1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { mandateId, orderId } = data || {};
  if (!mandateId || !orderId) throw new functions.https.HttpsError("invalid-argument", "mandateId and orderId are required.");

  const merchantId = process.env.JUSPAY_MERCHANT_ID;
  const apiKey = process.env.JUSPAY_API_KEY;
  if (!merchantId || !apiKey) throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials not configured.");

  try {
    const response = await axios.post(
      getJuspayMandateEndpoint(mandateId),
      new URLSearchParams({ command: "cancel_recurring_transaction", order_id: String(orderId) }).toString(),
      {
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid,
          "Content-Type": "application/x-www-form-urlencoded",
          version: "2023-06-30",
        },
        timeout: 20000,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Juspay stop mandate error:", error.response?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to stop Juspay mandate execution.");
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
      merchant_id: merchantId,
      customer_id: customerId,
      currency,
      ...(orderId ? { order_id: orderId } : {}),
      ...(amount !== undefined && amount !== null ? { amount: String(amount) } : {}),
      ...(offerCode ? { offer_code: offerCode } : {}),
    };
    const response = await axios.get(getJuspayOffersEndpoint(queryParams), {
      headers: {
        Authorization: getDbsAuthHeader(),
        "x-merchantid": merchantId,
        "x-routing-id": customerId,
        "Content-Type": "application/x-www-form-urlencoded",
        version: "2023-06-30",
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
      const response = await axios.get(
        `${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(orderId)}`,
        {
          headers: {
            Authorization: getDbsAuthHeader(),
            "x-merchantid": merchantId,
            "x-routing-id": context.auth.uid,
            "Content-Type": "application/x-www-form-urlencoded",
            version: "2023-06-30",
          },
          timeout: 20000,
        }
      );

      const payload =
        typeof response.data === "string"
          ? decryptAndVerifyJuspayStatus(response.data, JUSPAY_MERCHANT_PRIVATE_KEY.value(), JUSPAY_PUBLIC_KEY.value())
          : response.data;

      return {
        orderId,
        status: String(payload.status || "").toUpperCase(),
        status_id: payload.status_id || null,
        offers: payload.offers || payload.offer_details || payload.offer || [],
        raw: payload,
      };
    } catch (error) {
      console.error("DBS order status with offers error:", error.response?.data || error.message);
      throw new functions.https.HttpsError("internal", "Failed to retrieve DBS order status with offer details.");
    }
  });

// ==========================================
// 🚀 CANCEL / REFUND (DBS spec endpoints)
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
    // DBS Cancel path: /merchants/{merchant_id}/order/{order_id}/cancel  (singular "order")
    const cancelUrl = `${getDbsOrderStatusBaseUrl()}/merchants/${merchantId}/order/${encodeURIComponent(orderId)}/cancel`;
    const response = await axios.post(
      cancelUrl,
      { cancel_reason: reason },
      {
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid,
          "Content-Type": "application/json",
          version: "2023-06-30",
        },
        timeout: 20000,
      }
    );

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
      return {
        orderId,
        status: "NotCancellable",
        message: resp.data?.message || "Order is not in ACTIVE state.",
      };
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
    // DBS Refund path: /orders/{order_id}/refunds  (plural)
    const refundUrl = `${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(orderId)}/refunds`;
    const uniqueRequestId = `RF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`.slice(0, 20);

    const formBody = new URLSearchParams();
    formBody.append("unique_request_id", uniqueRequestId);
    if (amount !== undefined && amount !== null) formBody.append("amount", Number(amount).toFixed(2));
    formBody.append("metaData", JSON.stringify({ description: reason }));

    const response = await axios.post(refundUrl, formBody.toString(), {
      headers: {
        Authorization: getDbsAuthHeader(),
        "x-merchantid": merchantId,
        "x-routing-id": context.auth.uid,
        "Content-Type": "application/x-www-form-urlencoded",
        version: "2023-06-30",
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
      message: "Refund initiated successfully.",
      payload: response.data,
    };
  } catch (error) {
    const resp = error.response;
    if (resp && resp.data?.error_code) {
      return {
        orderId,
        status: "FAILED",
        message: resp.data.message || "Refund failed.",
        error_code: resp.data.error_code,
      };
    }
    console.error("Juspay refund error:", resp?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to refund Juspay order.");
  }
});

// ==========================================
// 🚀 DBS: ORDER STATUS (getJuspayOrderStatus)
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
        () =>
          axios.get(
            `${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(orderId)}`,
            {
              headers: {
                Authorization: getDbsAuthHeader(),
                "x-merchantid": merchantId,
                "x-routing-id": context.auth.uid,
                "Content-Type": "application/x-www-form-urlencoded",
                version: "2023-06-30",
              },
              timeout: 20000,
            }
          ),
        "DBS-Status"
      );

      const payload =
        typeof response.data === "string"
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
          payload.currency || payload.txn_detail?.currency || "INR"
        );
      }

      return {
        status,
        status_id: payload.status_id || null,
        session: sessionData
          ? {
              type: sessionData.type,
              referenceId: sessionData.referenceId,
              planTier: sessionData.planTier || null,
              subscriptionExpiry: sessionData.subscriptionExpiry || null,
            }
          : null,
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
    const orderId = payload.order_id || payload.order?.order_id;
    const status = String(payload.status || payload.order?.status || "").toUpperCase();
    if (!orderId) return res.status(400).send("Missing order_id");

    const eventId =
      payload.event_id ||
      `${orderId}:${status}:${payload.txn_detail?.txn_id || payload.txn_id || payload.status_id || "event"}`;
    const eventRef = admin.firestore().collection("juspayWebhookEvents").doc(String(eventId));
    const eventSnap = await eventRef.get();
    if (eventSnap.exists) return res.status(200).send("OK");

    if (status === "CHARGED" || Number(payload.status_id) === 21) {
      const updatedSession = await markJuspayOrderCharged(
        orderId,
        payload.txn_detail?.txn_id || payload.txn_id || payload.payment?.txn_id || null,
        payload.amount ?? payload.effective_amount ?? payload.txn_detail?.txn_amount,
        payload.currency || payload.txn_detail?.currency || "INR"
      );
      if (!updatedSession) return res.status(404).send("Payment session not found");
    }

    await admin.firestore().runTransaction(async (transaction) => {
      const existingEvent = await transaction.get(eventRef);
      if (!existingEvent.exists) {
        transaction.set(eventRef, {
          orderId,
          status,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
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

      const statusResponse = await axios.get(
        `${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(orderId)}`,
        {
          headers: {
            Authorization: getDbsAuthHeader(),
            "x-merchantid": merchantId,
            "Content-Type": "application/x-www-form-urlencoded",
            version: "2023-06-30",
          },
          timeout: 20000,
        }
      );

      const statusPayload =
        typeof statusResponse.data === "string"
          ? decryptAndVerifyJuspayStatus(statusResponse.data, merchantPrivateKey, juspayPublicKey)
          : statusResponse.data;

      const status = String(statusPayload.status || "").toUpperCase();
      const isCharged = status === "CHARGED" || Number(statusPayload.status_id) === 21;

      if (isCharged) {
        sessionData = await markJuspayOrderCharged(
          orderId,
          statusPayload.txn_detail?.txn_id || statusPayload.txn_id || null,
          statusPayload.amount ?? statusPayload.effective_amount ?? statusPayload.txn_detail?.txn_amount,
          statusPayload.currency || statusPayload.txn_detail?.currency || "INR"
        );
      }

      const title = isCharged ? "Payment successful" : `Payment status: ${status || "PENDING"}`;
      const message =
        isCharged && sessionData?.type === "subscription"
          ? "Your Prochem subscription is now active."
          : isCharged
          ? "Your order is being placed."
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
// 🚀 BACKWARD-COMPAT ALIASES (dbs.js exports)
//    These are the "new" Cloud Functions we built
//    alongside your existing ones. Keep them so
//    screens that call the new names work too.
// ==========================================
try {
  const dbs = require("./dbs");
  exports.createDBSSession = dbs.createDBSSession;
  exports.getDBSOrderStatus = dbs.getDBSOrderStatus;
  exports.cancelDBSOrder = dbs.cancelDBSOrder;
  exports.createRefund = dbs.createRefund;
  exports.getRefundsForOrder = dbs.getRefundsForOrder;
  exports.handleReturnURL = dbs.handleReturnURL;
  exports.dbsWebhook = dbs.dbsWebhook;
} catch (err) {
  console.warn("[index.js] Could not load dbs.js — new functions not exported:", err.message);
}