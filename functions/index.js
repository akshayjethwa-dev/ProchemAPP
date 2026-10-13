// File: functions/index.js
const functions = require("firebase-functions/v1");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// LAZY-LOAD HEAVY SDKs inside handlers to avoid deployment timeouts.
// Do NOT `require` cashfree-pg or instantiate Expo at module scope.
// ---------------------------------------------------------------------------

// Import the reusable WhatsApp service (kept, since it's lightweight)
const { sendWhatsApp } = require("./whatsappService");

const { defineSecret } = require("firebase-functions/params");
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");
const TWILIO_MESSAGING_SERVICE_SID = defineSecret("TWILIO_MESSAGING_SERVICE_SID");
const JUSPAY_MERCHANT_PRIVATE_KEY = defineSecret("JUSPAY_MERCHANT_PRIVATE_KEY");
const JUSPAY_PUBLIC_KEY = defineSecret("JUSPAY_PUBLIC_KEY");

admin.initializeApp();

// ---------------------------------------------------------------------------
// Lazy singletons (only created when first needed at runtime)
// ---------------------------------------------------------------------------
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
// Juspay HyperCheckout config
// ===========================================================================
// Sandbox  ->  https://sandbox.juspay.in/session
// Production -> https://api.juspay.in/session
// ---------------------------------------------------------------------------
const JUSPAY_SESSION_URLS = [
  "https://sandbox.juspay.in/session",
  "https://api.juspay.in/session",
];

const JUSPAY_ORDER_STATUS_BASE_URLS = [
  "https://sandbox.juspay.in",
  "https://api.juspay.in",
];

const getDbsSessionUrl = () => {
  const sessionUrl = process.env.JUSPAY_API_URL;
  if (!JUSPAY_SESSION_URLS.includes(sessionUrl)) {
    throw new Error(
      "JUSPAY_API_URL must be set to the Juspay Session API URL: " +
      "https://sandbox.juspay.in/session (sandbox) or " +
      "https://api.juspay.in/session (production)."
    );
  }
  return sessionUrl;
};

// Derive the Order Status base URL from the configured Session URL.
// e.g. https://api.juspay.in/session -> https://api.juspay.in
const getDbsOrderStatusBaseUrl = () => {
  const sessionUrl = getDbsSessionUrl();
  const base = sessionUrl.replace(/\/session\/?$/, "");
  if (!JUSPAY_ORDER_STATUS_BASE_URLS.includes(base)) {
    throw new Error("Unable to derive Juspay Order Status base URL from JUSPAY_API_URL.");
  }
  return base;
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
// Helper: DBS Basic Auth header (Section 2 of the DBS guide)
// "Basic " + Base64(API Key + ":")
// ---------------------------------------------------------------------------
const getDbsAuthHeader = () =>
  `Basic ${Buffer.from(`${process.env.JUSPAY_API_KEY}:`).toString("base64")}`;

// ---------------------------------------------------------------------------
// Idempotent order fulfillment (kept from original, unchanged in behavior)
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

    let userRef;
    let userSnapshot;
    let orderRef;
    let orderSnapshot;
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
// JWE / JWS decrypt+verify (unchanged — still needed for /v4/order-status if used)
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
  if (
    !["RSA-OAEP", "RSA-OAEP-256"].includes(header.alg) ||
    header.enc !== "A256GCM"
  ) {
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
  if (jwsHeader.alg !== "RS256")
    throw new Error("DBS status JWS uses an unsupported signing algorithm.");
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
// 🚀 PUSH NOTIFICATION TRIGGER (Gen 2 - INDIA REGION)
// ==========================================
exports.sendPushNotification = onDocumentCreated(
  {
    document: "notifications/{docId}",
    region: "asia-south1",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;

    const notificationData = snap.data();
    const { title, message, userId } = notificationData;
    const expo = getExpo(); // lazy-init

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
          if (token && Expo.isExpoPushToken(token)) {
            tokens.push(token);
          }
        }
      }

      if (tokens.length === 0) {
        console.log("No valid Expo push tokens found.");
        return null;
      }

      let messages = [];
      for (let pushToken of tokens) {
        messages.push({
          to: pushToken,
          sound: "default",
          title: title || "New Notification",
          body: message || "You have a new message.",
          data: { customData: "prochem_data" },
        });
      }

      let chunks = expo.chunkPushNotifications(messages);
      let tickets = [];

      for (let chunk of chunks) {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      console.log("Push notifications sent successfully!");
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
    secrets: [
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
      TWILIO_MESSAGING_SERVICE_SID,
    ],
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
          debugLog += `- Skipped ${userPhone}: User explicitly opted out of WhatsApp.\n`;
        } else if (!wantsMarketAlerts) {
          debugLog += `- Skipped ${userPhone}: User turned off market alerts.\n`;
        } else if (isExcluded) {
          debugLog += `- Skipped ${userPhone}: User explicitly excluded.\n`;
        } else {
          usersToAlert.push({ userId, phoneNumber: userPhone });
          debugLog += `✅ ADDED ${userPhone} to broadcast list.\n`;
        }
      });

      if (usersToAlert.length === 0) {
        console.log("No valid users found. Aborting. " + debugLog);
        await admin.firestore().collection("whatsappLogs").add({
          direction: "outbound",
          toNumber: "SYSTEM_DIAGNOSTIC",
          body: `Attempted to broadcast Requirement #${docId} (${productName}), but found 0 eligible users.\n\nLog:\n${debugLog}`,
          templateName: "System_Diagnostic",
          messageType: "debug",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: "failed",
          error: "No eligible users found. See body for details.",
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
            }).catch((err) => {
              console.error(`Broadcast transmission failed for ${user.phoneNumber}:`, err.message);
            })
          )
        );

        if (i + chunkSize < usersToAlert.length) {
          console.log(`Sent batch of ${chunk.length}. Pausing 3 seconds...`);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      console.log(`Successfully processed broadcast out to ${usersToAlert.length} targets.`);
      return true;
    } catch (error) {
      console.error("❌ Critical error intercepted during broadcast sequence:", error);
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
    secrets: [
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
      TWILIO_MESSAGING_SERVICE_SID,
    ],
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
      console.error("Error sending Template 1:", err);
      return null;
    }
  }
);

// ==========================================
// 🚀 INBOUND WHATSAPP WEBHOOK (TWILIO)
// ==========================================
exports.whatsappWebhook = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { From, Body, WaId, ProfileName } = req.body;

      if (From && WaId) {
        const incomingNumber = From.replace("whatsapp:", "");

        let localNumber = incomingNumber;
        if (incomingNumber.startsWith("+91")) {
          localNumber = incomingNumber.substring(3);
        }

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
            if (!docData.whatsappWaId) {
              await doc.ref.update({ whatsappWaId: WaId, whatsappOptIn: true });
            }
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
                  const convQuery = await db
                    .collection("conversations")
                    .where("rfqId", "==", rfqId)
                    .get();
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

                  await incomingLogRef.update({ conversationId: conversationId });

                  const deepLink = `https://app.prochemapp.com/negotiation/${rfqId}`;
                  await sendWhatsApp(
                    incomingNumber,
                    `✅ Your interest is recorded. Negotiation started for ${rfqData.productName} (RFQ ID: ${rfqId}).\n\n👉 Open App to view: ${deepLink}`,
                    null,
                    {
                      templateName: "Interest_Recorded",
                      type: "service",
                      userId: senderId,
                      conversationId: conversationId,
                    }
                  );
                } else if (rfqData.buyerId === senderId) {
                  await sendWhatsApp(
                    incomingNumber,
                    `ℹ️ You are the buyer for this requirement (ID: ${rfqId}). Please wait for a supplier to initiate negotiation.`,
                    null,
                    { templateName: "System_Error", type: "service", userId: senderId }
                  );
                } else {
                  await sendWhatsApp(
                    incomingNumber,
                    `❌ You are not authorized to negotiate this RFQ (ID: ${rfqId}).`,
                    null,
                    { templateName: "System_Error", type: "service", userId: senderId }
                  );
                }
              } else {
                await sendWhatsApp(
                  incomingNumber,
                  `❌ We couldn't find an RFQ with ID: ${rfqId}. It may have been fulfilled or expired.`,
                  null,
                  { templateName: "System_Error", type: "service", userId: senderId }
                );
              }
            }
          } else {
            await sendWhatsApp(
              incomingNumber,
              `🚫 Direct replies via WhatsApp are not supported.\n\nTo keep your negotiations secure and prevent missing messages, please view and reply to active chats directly inside the platform.`,
              null,
              {
                templateName: "app_redirect_notice",
                templateSid: "HX_APP_REDIRECT_NOTICE_SID",
                type: "service",
                userId: senderId,
              }
            );
          }
        }
      }
      res.status(200).send("OK");
    } catch (error) {
      console.error("❌ Error processing incoming WhatsApp webhook:", error);
      res.status(500).send("Internal Server Error");
    }
  });

// ==========================================
// 🚀 IN-APP MESSAGE TO WHATSAPP (TEMPLATES 2 & 3)
// ==========================================
exports.onAppMessageCreated = onDocumentCreated(
  {
    document: "conversations/{conversationId}/messages/{messageId}",
    region: "asia-south1",
    secrets: [
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
      TWILIO_MESSAGING_SERVICE_SID,
    ],
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
      if (messageData.senderRole === "buyer") {
        targetUserId = convData.sellerUserId;
      } else if (messageData.senderRole === "seller") {
        targetUserId = convData.buyerUserId;
      } else {
        return null;
      }

      const targetUserDoc = await db.collection("users").doc(targetUserId).get();
      const rfqDoc = await db.collection("rfqs").doc(convData.rfqId).get();

      if (targetUserDoc.exists && rfqDoc.exists) {
        const targetUserData = targetUserDoc.data();
        const rfqData = rfqDoc.data();

        const prefs = targetUserData.whatsappPreferences || {};
        const wantsNegotiations = prefs.negotiations !== false;
        const targetPhone = targetUserData.phoneNumber || targetUserData.phone;

        if (
          targetPhone &&
          targetUserData.whatsappOptIn !== false &&
          wantsNegotiations
        ) {
          const deepLink = `https://app.prochemapp.com/negotiation/${convData.rfqId}`;
          let outMsg = "";
          let templateUsed = "";
          let templateSid = "";
          let templateVariables = {};

          if (messageData.isOffer && messageData.senderRole === "seller") {
            const totalValue = (
              messageData.proposedQty * messageData.proposedPrice
            ).toFixed(2);

            outMsg = `💰 *Formal Offer Received*\n_Prochem — Negotiation #${convData.rfqId}_\n\nThe supplier has sent you a confirmed offer:\n\n🧪 ${rfqData.productName}\n📦 Qty: ${messageData.proposedQty} ${rfqData.unit}\n💵 Price: ₹${messageData.proposedPrice}\n\n*Total Value: ₹${totalValue}* (excl. GST & fees)\n\n👉 Open in App to Accept: ${deepLink}`;
            templateUsed = "formal_offer_received";
            templateSid = "HX3b3ccf973fe8a1dcea5586c1714bc671";
            templateVariables = {
              "1": convData.rfqId,
              "2": rfqData.productName,
              "3": `${messageData.proposedQty} ${rfqData.unit}`,
              "4": String(messageData.proposedPrice),
              "5": totalValue,
              "6": deepLink,
            };
          } else {
            const actualMsg = messageData.body || messageData.text;
            if (!actualMsg) return null;

            outMsg = `💬 *New Message — Prochem Negotiation*\n\n*Requirement:* ${rfqData.productName} (#${convData.rfqId})\n\n*Message:*\n"${actualMsg}"\n\n_To reply to this message securely, please open the app._`;
            templateUsed = "chat_message_relay";
            templateSid = "HXde0a53b6349cdd5e03b33dd6a6638245";
            templateVariables = {
              "1": rfqData.productName,
              "2": convData.rfqId,
              "3": actualMsg,
              "4": deepLink,
            };
          }

          if (outMsg !== "") {
            await sendWhatsApp(targetPhone, outMsg, null, {
              templateName: templateUsed,
              templateSid: templateSid,
              templateVariables: templateVariables,
              type: "service",
              userId: targetUserId,
              conversationId: conversationId,
            });
          }
        }
      }

      return true;
    } catch (error) {
      console.error("❌ Error forwarding in-app message:", error);
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
            templateVariables: {
              "1": rfqId,
              "2": after.productName,
              "3": `${after.agreedQuantity} ${after.unit}`,
              "4": String(after.agreedPrice),
              "5": payoutAmount,
              "6": deepLink,
            },
            type: "transactional",
            userId: after.sellerId,
          });
        }
        return true;
      } catch (err) {
        console.error("Error sending Template 5:", err);
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
          userId: userId,
        });

        return true;
      } catch (err) {
        console.error("❌ Error sending welcome WhatsApp:", err);
        return null;
      }
    }

    return null;
  }
);

// ==========================================
// 🚀 TWILIO WHATSAPP INTEGRATION TEST
// ==========================================
exports.sendWhatsAppTest = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
    if (!process.env.MY_PERSONAL_WHATSAPP)
      return res.status(500).send("MY_PERSONAL_WHATSAPP is not configured in .env yet.");
    try {
      const messageSid = await sendWhatsApp(
        process.env.MY_PERSONAL_WHATSAPP,
        "Hello! This is a test message from the new Prochem reusable WhatsApp module.",
        null,
        {
          templateName: "System_Test",
          type: "service",
        }
      );
      res.status(200).send(`Message sent successfully! Message SID: ${messageSid}`);
    } catch (error) {
      res.status(500).send(`Failed to send message. Check Firebase logs for details. Error: ${error.message}`);
    }
  });

// ==========================================
// 🚀 CASHFREE: CREATE ORDER (lazy-loaded SDK)
// ==========================================
exports.createCashfreeOrder = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { amount, type, referenceId, customerDetails } = data;

    if (!amount || !type || !referenceId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Amount, type, and referenceId are required."
      );
    }

    try {
      const Cashfree = getCashfree(); // lazy-init
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
        order_meta: {
          return_url: "https://prochem.in/payment-status?order_id={order_id}",
        },
        order_tags: {
          type: type,
          referenceId: referenceId,
        },
      };

      const response = await Cashfree.PGCreateOrder("2023-08-01", request);

      if (type === "product") {
        await admin.firestore().collection("orders").doc(referenceId).update({
          cashfreeOrderId: cashfreeOrderId,
          paymentStatus: "PENDING_GATEWAY",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return {
        payment_session_id: response.data.payment_session_id,
        order_id: cashfreeOrderId,
      };
    } catch (error) {
      console.error("Cashfree Order Error:", error.response?.data || error.message);
      throw new functions.https.HttpsError("internal", "Failed to create Cashfree order.");
    }
  });

// ==========================================
// 🚀 CASHFREE: WEBHOOK LISTENER (lazy-loaded SDK)
// ==========================================
exports.cashfreeWebhook = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const Cashfree = getCashfree(); // lazy-init
      Cashfree.XClientId = process.env.CASHFREE_APP_ID;
      Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
      Cashfree.XEnvironment =
        process.env.CASHFREE_ENVIRONMENT === "PRODUCTION"
          ? Cashfree.Environment.PRODUCTION
          : Cashfree.Environment.SANDBOX;

      const signature = req.headers["x-webhook-signature"];
      const timestamp = req.headers["x-webhook-timestamp"];

      if (!signature || !timestamp) {
        return res.status(400).send("Missing security headers");
      }

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
      console.error("Webhook Error / Forgery Attempt:", error.message);
      res.status(400).send("Webhook verification failed");
    }
  });

// ==========================================
// 🚀 DBS HYPERCHECKOUT: CREATE SESSION (Section 4.1)
// ==========================================
exports.createJuspaySession = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { type = "product", referenceId, customerDetails } = data || {};
    if (!referenceId || !["product", "subscription"].includes(type)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid payment type and referenceId are required."
      );
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const clientId = process.env.JUSPAY_CLIENT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !clientId || !apiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "DBS server credentials are not configured."
      );
    }

    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    const returnUrl =
      process.env.JUSPAY_RETURN_URL ||
      (projectId
        ? `https://asia-south1-${projectId}.cloudfunctions.net/juspayReturn`
        : null);
    if (!returnUrl || !returnUrl.startsWith("https://")) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "JUSPAY_RETURN_URL must be configured as an HTTPS URL for this Firebase project."
      );
    }

    let amountInRupees;
    let planTier;
    let subscriptionDurationDays;
    let orderSnapshot;

    if (type === "subscription") {
      const plan = JUSPAY_SUBSCRIPTION_PLANS[referenceId];
      if (!plan) throw new functions.https.HttpsError("invalid-argument", "Unknown subscription plan.");
      amountInRupees = plan.amount;
      planTier = plan.tier;
      subscriptionDurationDays = plan.durationDays;
    } else {
      orderSnapshot = await admin.firestore().collection("orders").doc(referenceId).get();
      if (!orderSnapshot.exists || orderSnapshot.data().buyerId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Order does not belong to the current user."
        );
      }
      amountInRupees = Number(orderSnapshot.data().totalAmount);
    }

    if (!Number.isFinite(amountInRupees) || amountInRupees < 1) {
      throw new functions.https.HttpsError("invalid-argument", "The payable amount is invalid.");
    }

    // DBS: order_id max 21 chars, alphanumeric only.
    const dbsOrderId = `dbs${Date.now().toString(36)}${crypto
      .randomBytes(4)
      .toString("hex")}`.slice(0, 21);
    const phone = String(customerDetails?.phone || "9999999999")
      .replace(/[^0-9]/g, "")
      .slice(-10);
    const email = customerDetails?.email || "buyer@prochem.in";
    const sessionUrl = getDbsSessionUrl();

    try {
      const response = await fetch(sessionUrl, {
        method: "POST",
        headers: {
          Authorization: getDbsAuthHeader(),
          "Content-Type": "application/json", // DBS: JSON for Session API
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid, // DBS: pass customer_id
        },
        body: JSON.stringify({
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
        }),
      });

      const payload = await response.json();

      if (response.status === 401 || response.status === 403) {
        console.error("DBS rejected Session API credentials:", {
          status: response.status,
          errorCode: payload.error_code || payload.error_info?.error_code,
        });
        throw new functions.https.HttpsError(
          "failed-precondition",
          "DBS rejected the production API credentials. Check that the active API key, merchant ID, and production endpoint belong to the same account."
        );
      }
      if (response.status === 400) {
        const invalidFields = Array.isArray(payload.error_info?.fields)
          ? payload.error_info.fields
              .map((field) => {
                if (typeof field === "string") return field;
                if (!field || typeof field !== "object") return "unknown field";
                const fieldName =
                  field.name || field.field || field.field_name || field.parameter || field.path;
                const reason = field.message || field.reason || field.code;
                return (
                  [fieldName, reason].filter(Boolean).join(": ") ||
                  `field keys: ${Object.keys(field).join(",")}`
                );
              })
              .join("; ")
          : "request parameters";
        throw new functions.https.HttpsError(
          "invalid-argument",
          `DBS rejected the Session API request. Check these fields: ${invalidFields}.`
        );
      }
      if (!response.ok || !payload.sdk_payload) {
        const fields = Array.isArray(payload.error_info?.fields)
          ? payload.error_info.fields.map((field) => ({
              name: field.name || field.field,
              code: field.code,
              message: field.message,
            }))
          : undefined;
        console.error(
          "DBS session error:",
          JSON.stringify({
            httpStatus: response.status,
            errorCode: payload.error_code || payload.error_info?.code,
            fields,
            developerMessage: payload.error_info?.developer_message,
          })
        );
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

      // Return BOTH sdk_payload (native SDKs) and payment_links (Web/redirect)
      return {
        order_id: dbsOrderId,
        sdk_payload: payload.sdk_payload,
        payment_url: payload.payment_links?.web || payload.payment_links?.mobile || null,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("DBS session error:", error.response?.data || error.message);
      throw new functions.https.HttpsError("internal", "Failed to create DBS payment session.");
    }
  });

exports.executeJuspayMandate = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const {
      mandateId,
      orderId,
      amount,
      customerId = context.auth.uid,
      currency = "INR",
      returnUrl = process.env.JUSPAY_RETURN_URL,
    } = data || {};

    if (!mandateId || !orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "mandateId and orderId are required."
      );
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
    }

    try {
      const response = await fetch(`${getDbsOrderStatusBaseUrl()}/txns`, {
        method: "POST",
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": customerId,
          "Content-Type": "application/json",
          version: "2023-06-30",
        },
        body: JSON.stringify({
          merchant_id: merchantId,
          order: {
            order_id: orderId,
            amount: String(amount ?? 0),
            customer_id: customerId,
            currency,
            return_url: returnUrl,
          },
          mandate_id: mandateId,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Juspay mandate execution error:", { status: response.status, payload });
        throw new functions.https.HttpsError("internal", "Failed to execute Juspay mandate.");
      }

      return payload;
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Juspay mandate execution error:", error.message);
      throw new functions.https.HttpsError("internal", "Failed to execute Juspay mandate.");
    }
  });

exports.listJuspayMandates = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const customerId = data?.customerId || context.auth.uid;
    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
    }

    try {
      const response = await fetch(getJuspayCustomerMandatesEndpoint(customerId), {
        method: "GET",
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": customerId,
          "Content-Type": "application/x-www-form-urlencoded",
          version: "2023-06-30",
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Juspay list mandates error:", { status: response.status, payload });
        throw new functions.https.HttpsError("internal", "Failed to fetch mandates.");
      }

      return payload;
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Juspay list mandate error:", error.message);
      throw new functions.https.HttpsError("internal", "Failed to fetch mandates.");
    }
  });

exports.getJuspayMandateStatus = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { mandateId, orderId } = data || {};
    const lookupOrderId = orderId || mandateId;
    if (!lookupOrderId) {
      throw new functions.https.HttpsError("invalid-argument", "orderId or mandateId is required.");
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
    }

    try {
      const response = await fetch(`${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(lookupOrderId)}`, {
        method: "GET",
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid,
          "Content-Type": "application/x-www-form-urlencoded",
          version: "2023-06-30",
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Juspay mandate status error:", { status: response.status, payload });
        throw new functions.https.HttpsError("internal", "Failed to fetch mandate status.");
      }

      return payload;
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Juspay mandate status error:", error.message);
      throw new functions.https.HttpsError("internal", "Failed to fetch mandate status.");
    }
  });

exports.pauseJuspayMandate = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { mandateId, pauseStartDate, pauseEndDate } = data || {};
    if (!mandateId) {
      throw new functions.https.HttpsError("invalid-argument", "mandateId is required.");
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
    }

    try {
      const body = {
        command: "pause",
        pause_start_date: pauseStartDate ?? Math.floor(Date.now() / 1000),
        pause_end_date: pauseEndDate ?? null,
      };

      const response = await fetch(getJuspayMandateEndpoint(mandateId), {
        method: "POST",
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid,
          "Content-Type": "application/x-www-form-urlencoded",
          version: "2023-06-30",
        },
        body: new URLSearchParams(body).toString(),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Juspay pause mandate error:", { status: response.status, payload });
        throw new functions.https.HttpsError("internal", "Failed to pause Juspay mandate.");
      }

      return payload;
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Juspay pause mandate error:", error.message);
      throw new functions.https.HttpsError("internal", "Failed to pause Juspay mandate.");
    }
  });

exports.revokeJuspayMandate = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { mandateId, shouldDoImplicitRevoke = false } = data || {};
    if (!mandateId) {
      throw new functions.https.HttpsError("invalid-argument", "mandateId is required.");
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
    }

    try {
      const response = await fetch(getJuspayMandateEndpoint(mandateId), {
        method: "POST",
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid,
          "Content-Type": "application/x-www-form-urlencoded",
          version: "2023-06-30",
        },
        body: new URLSearchParams({
          command: "revoke",
          should_do_implicit_revoke: String(shouldDoImplicitRevoke),
        }).toString(),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Juspay revoke mandate error:", { status: response.status, payload });
        throw new functions.https.HttpsError("internal", "Failed to revoke Juspay mandate.");
      }

      return payload;
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Juspay revoke mandate error:", error.message);
      throw new functions.https.HttpsError("internal", "Failed to revoke Juspay mandate.");
    }
  });

exports.stopJuspayMandateExecution = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { mandateId, orderId } = data || {};
    if (!mandateId || !orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "mandateId and orderId are required."
      );
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
    }

    try {
      const response = await fetch(getJuspayMandateEndpoint(mandateId), {
        method: "POST",
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid,
          "Content-Type": "application/x-www-form-urlencoded",
          version: "2023-06-30",
        },
        body: new URLSearchParams({
          command: "cancel_recurring_transaction",
          order_id: String(orderId),
        }).toString(),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Juspay stop mandate execution error:", { status: response.status, payload });
        throw new functions.https.HttpsError("internal", "Failed to stop Juspay mandate execution.");
      }

      return payload;
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Juspay stop mandate execution error:", error.message);
      throw new functions.https.HttpsError("internal", "Failed to stop Juspay mandate execution.");
    }
  });

exports.listJuspayOffers = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const {
      orderId,
      customerId = context.auth.uid,
      amount,
      currency = "INR",
      offerCode,
    } = data || {};

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
    }

    try {
      const queryParams = {
        merchant_id: merchantId,
        customer_id: customerId,
        currency,
        ...(orderId ? { order_id: orderId } : {}),
        ...(amount !== undefined && amount !== null ? { amount: String(amount) } : {}),
        ...(offerCode ? { offer_code: offerCode } : {}),
      };

      const response = await fetch(getJuspayOffersEndpoint(queryParams), {
        method: "GET",
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": customerId,
          "Content-Type": "application/x-www-form-urlencoded",
          version: "2023-06-30",
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Juspay list offers error:", { status: response.status, payload });
        throw new functions.https.HttpsError("internal", "Failed to list Juspay offers.");
      }

      return payload;
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Juspay list offers error:", error.message);
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
      throw new functions.https.HttpsError(
        "permission-denied",
        "Order does not belong to the current user."
      );
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (
      !merchantId ||
      !apiKey ||
      !JUSPAY_MERCHANT_PRIVATE_KEY.value() ||
      !JUSPAY_PUBLIC_KEY.value()
    ) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "DBS API credentials and response-verification keys must be configured."
      );
    }

    try {
      const response = await fetch(`${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
        method: "GET",
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid,
          "Content-Type": "application/x-www-form-urlencoded",
          version: "2023-06-30",
        },
      });

      const encryptedPayload = await readJuspayEncryptedResponse(response);
      if (!response.ok) {
        console.error("DBS order status with offers error:", { status: response.status });
        throw new Error("DBS status request failed.");
      }

      const payload =
        typeof encryptedPayload === "string"
          ? decryptAndVerifyJuspayStatus(
              encryptedPayload,
              JUSPAY_MERCHANT_PRIVATE_KEY.value(),
              JUSPAY_PUBLIC_KEY.value()
            )
          : encryptedPayload;

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

exports.cancelJuspayOrder = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { orderId, reason = "customer_cancelled" } = data || {};
    if (!orderId) {
      throw new functions.https.HttpsError("invalid-argument", "orderId is required.");
    }

    const session = await admin.firestore().collection("juspaySessions").doc(String(orderId)).get();
    if (!session.exists || session.data().userId !== context.auth.uid) {
      throw new functions.https.HttpsError("permission-denied", "Order does not belong to the current user.");
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
    }

    try {
      const response = await fetch(`${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid,
          "Content-Type": "application/json",
          version: "2023-06-30",
        },
        body: JSON.stringify({ reason }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Juspay cancel error:", { status: response.status, payload });
        throw new functions.https.HttpsError("internal", "Failed to cancel Juspay order.");
      }

      await admin.firestore().collection("juspaySessions").doc(String(orderId)).update({
        status: "CANCELLED",
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        orderId,
        status: payload.status || "CANCELLED",
        message: payload.message || "Order cancelled successfully.",
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Juspay cancel error:", error.message);
      throw new functions.https.HttpsError("internal", "Failed to cancel Juspay order.");
    }
  });

exports.refundJuspayOrder = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { orderId, amount, reason = "customer_refund" } = data || {};
    if (!orderId) {
      throw new functions.https.HttpsError("invalid-argument", "orderId is required.");
    }

    const session = await admin.firestore().collection("juspaySessions").doc(String(orderId)).get();
    if (!session.exists || session.data().userId !== context.auth.uid) {
      throw new functions.https.HttpsError("permission-denied", "Order does not belong to the current user.");
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (!merchantId || !apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "Juspay API credentials are not configured.");
    }

    try {
      const response = await fetch(`${getDbsOrderStatusBaseUrl()}/orders/${encodeURIComponent(orderId)}/refund`, {
        method: "POST",
        headers: {
          Authorization: getDbsAuthHeader(),
          "x-merchantid": merchantId,
          "x-routing-id": context.auth.uid,
          "Content-Type": "application/json",
          version: "2023-06-30",
        },
        body: JSON.stringify({
          amount: amount ?? session.data().amount,
          reason,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Juspay refund error:", { status: response.status, payload });
        throw new functions.https.HttpsError("internal", "Failed to refund Juspay order.");
      }

      await admin.firestore().collection("juspaySessions").doc(String(orderId)).update({
        status: "REFUNDED",
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        orderId,
        status: payload.status || "REFUNDED",
        message: payload.message || "Refund initiated successfully.",
        payload,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("Juspay refund error:", error.message);
      throw new functions.https.HttpsError("internal", "Failed to refund Juspay order.");
    }
  });

// ==========================================
// 🚀 DBS HYPERCHECKOUT: ORDER STATUS (Section 4.2)
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
      throw new functions.https.HttpsError(
        "permission-denied",
        "Order does not belong to the current user."
      );
    }

    const merchantId = process.env.JUSPAY_MERCHANT_ID;
    const apiKey = process.env.JUSPAY_API_KEY;
    if (
      !merchantId ||
      !apiKey ||
      !JUSPAY_MERCHANT_PRIVATE_KEY.value() ||
      !JUSPAY_PUBLIC_KEY.value()
    ) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "DBS API credentials and response-verification keys must be configured."
      );
    }

    try {
      // DBS Order Status: GET {base}/orders/{order_id}
      const statusBaseUrl = getDbsOrderStatusBaseUrl();
      const response = await fetch(
        `${statusBaseUrl}/orders/${encodeURIComponent(orderId)}`,
        {
          method: "GET",
          headers: {
            Authorization: getDbsAuthHeader(),
            "x-merchantid": merchantId,
            "x-routing-id": context.auth.uid,
            "Content-Type": "application/x-www-form-urlencoded", // DBS requires this
            version: "2023-06-30", // Pin API version per DBS guide
          },
        }
      );

      const encryptedPayload = await readJuspayEncryptedResponse(response);
      if (!response.ok) {
        console.error("DBS status error:", { status: response.status });
        throw new Error("DBS status request failed.");
      }

      // If DBS returns plain JSON (unencrypted), use it directly.
      // If it's a JWE token, decrypt+verify it.
      const payload =
        typeof encryptedPayload === "string"
          ? decryptAndVerifyJuspayStatus(
              encryptedPayload,
              JUSPAY_MERCHANT_PRIVATE_KEY.value(),
              JUSPAY_PUBLIC_KEY.value()
            )
          : encryptedPayload;

      const status = String(payload.status || "").toUpperCase();
      let sessionData = session.data();

      // DBS Section 9: status_id 21 == CHARGED
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
// 🚀 DBS HYPERCHECKOUT: WEBHOOK LISTENER
// ==========================================
exports.juspayWebhook = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
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

      // DBS Section 9: status_id 21 == CHARGED
      if (status === "CHARGED" || Number(payload.status_id) === 21) {
        const updatedSession = await markJuspayOrderCharged(
          orderId,
          payload.txn_detail?.txn_id || payload.txn_id || payload.payment?.txn_id || null,
          payload.amount ??
            payload.effective_amount ??
            payload.txn_detail?.txn_amount,
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
// 🚀 DBS HYPERCHECKOUT: RETURN URL (Section 3.2)
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

      const statusBaseUrl = getDbsOrderStatusBaseUrl();
      const statusResponse = await fetch(
        `${statusBaseUrl}/orders/${encodeURIComponent(orderId)}`,
        {
          method: "GET",
          headers: {
            Authorization: getDbsAuthHeader(),
            "x-merchantid": merchantId,
            "Content-Type": "application/x-www-form-urlencoded",
            version: "2023-06-30",
          },
        }
      );
      if (!statusResponse.ok) {
        console.error("DBS return status request failed:", { status: statusResponse.status });
        return res.status(502).send("Unable to verify payment status");
      }

      const encryptedPayload = await readJuspayEncryptedResponse(statusResponse);
      const statusPayload =
        typeof encryptedPayload === "string"
          ? decryptAndVerifyJuspayStatus(encryptedPayload, merchantPrivateKey, juspayPublicKey)
          : encryptedPayload;

      const status = String(statusPayload.status || "").toUpperCase();
      const isCharged = status === "CHARGED" || Number(statusPayload.status_id) === 21;

      if (isCharged) {
        sessionData = await markJuspayOrderCharged(
          orderId,
          statusPayload.txn_detail?.txn_id || statusPayload.txn_id || null,
          statusPayload.amount ??
            statusPayload.effective_amount ??
            statusPayload.txn_detail?.txn_amount,
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

      return res
        .status(statusResponse.ok ? 200 : 502)
        .send(
          `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prochem Payment</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:48px 20px;color:#1e293b}h2{color:${
            isCharged ? "#15803d" : "#b45309"
          }}</style></head><body><h2>${
            isCharged ? "Payment successful" : title
          }</h2><p>${message}</p><p>This window will close automatically in <span id="countdown">3</span> seconds.</p><script>let n=3;const el=document.getElementById('countdown');const t=setInterval(()=>{n--;el.textContent=n;if(n<=0){clearInterval(t);window.close();}},1000);</script></body></html>`
        );
    } catch (error) {
      console.error("DBS return error:", error.message);
      return res.status(500).send("Unable to verify payment");
    }
  });