// File: functions/index.js
const functions = require("firebase-functions/v1"); 
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore"); 
const admin = require("firebase-admin");
const { Expo } = require("expo-server-sdk"); 
const { Cashfree } = require("cashfree-pg"); 

// Import the reusable WhatsApp service
const { sendWhatsApp } = require("./whatsappService");

const { defineSecret } = require("firebase-functions/params");
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN   = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");
const TWILIO_MESSAGING_SERVICE_SID = defineSecret("TWILIO_MESSAGING_SERVICE_SID");

admin.initializeApp();
const expo = new Expo();

// ==========================================
// 🚀 PUSH NOTIFICATION TRIGGER (Gen 2 - INDIA REGION)
// ==========================================
exports.sendPushNotification = onDocumentCreated(
  {
    document: "notifications/{docId}",
    region: "asia-south1" 
  }, 
  async (event) => {
    const snap = event.data;
    if (!snap) return null; 

    const notificationData = snap.data();
    const { title, message, userId } = notificationData;

    let tokens = [];

    try {
      if (userId === "ALL") {
        const usersSnap = await admin.firestore().collection("users").get();
        usersSnap.forEach((doc) => {
          const token = doc.data().expoPushToken;
          if (token && Expo.isExpoPushToken(token)) {
            tokens.push(token);
          }
        });
      } else {
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        if (userDoc.exists) {
          const token = userDoc.data().expoPushToken;
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
});

// ==========================================
// 🚀 BROADCAST NEW REQUIREMENTS (UPDATED BATCHING)
// ==========================================
exports.onRequirementCreated = onDocumentCreated(
  {
    document: "customRequirements/{docId}",
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_MESSAGING_SERVICE_SID]
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
      const usersSnap = await admin.firestore().collection("users")
        .where("whatsappOptIn", "==", true)
        .get();
      
      const displayPrice = targetPrice ? `₹${targetPrice}` : "Negotiable";
      const displayQty = `${quantity} ${unit}`.trim() || "Check App";
      const msg = `🔔 *New Buyer Requirement — Prochem*\n\nA buyer is looking for:\n\n🧪 *Product:* ${productName}\n📦 *Quantity:* ${displayQty}\n💰 *Target Price:* ${displayPrice}\n\n*Requirement ID:* #${docId}\n\nReply *INTEREST ${docId}* to start negotiation via Prochem.\n\n_(This requirement is live — respond quickly to close the deal)_\n\n_Prochem Marketplace_`;

      const usersToAlert = [];

      usersSnap.forEach((doc) => {
        const userData = doc.data();
        const userId = doc.id;

        const isSeller = userData.userType === 'seller' || userData.userType === 'dual';
        const isExcluded = 
          userId === buyerId || 
          (reqData.excludedSellerIds && reqData.excludedSellerIds.includes(userId)) || 
          userId === reqData.excludedSellerId;

        const prefs = userData.whatsappPreferences || {};
        const wantsMarketAlerts = prefs.marketAlerts !== false; 

        if (isSeller && !isExcluded && userData.phoneNumber && wantsMarketAlerts) {
          usersToAlert.push({ userId, phoneNumber: userData.phoneNumber });
        }
      });

      const chunkSize = 10;
      for (let i = 0; i < usersToAlert.length; i += chunkSize) {
        const chunk = usersToAlert.slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(user => 
          sendWhatsApp(user.phoneNumber, msg, null, {
            templateName: "prochem_market_alert",
            templateSid: "HX24554dd2af8db376b1a1609f13cfffbc", // Keep your existing market alert SID
            templateVariables: {
              "1": String(productName),
              "2": String(displayQty),
              "3": String(displayPrice),
              "4": String(docId)
            },
            type: "marketing",
            userId: user.userId
          }).catch(err => {
            console.error(`Chunk broadcast failed for ${user.phoneNumber}:`, err.message);
          })
        ));
      }

      return true;

    } catch (error) {
      console.error("❌ Error broadcasting requirement:", error);
      return null;
    }
});

// ==========================================
// 🚀 TEMPLATE 1: NEW NEGOTIATION REQUEST
// ==========================================
exports.onDirectRfqCreated = onDocumentCreated(
  { document: "rfqs/{rfqId}", 
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_MESSAGING_SERVICE_SID]
  },
  async (event) => {
    const rfqData = event.data.data();
    const rfqId = event.params.rfqId;

    if (!rfqData.sellerId) return null; 

    try {
      const sellerDoc = await admin.firestore().collection("users").doc(rfqData.sellerId).get();
      if (!sellerDoc.exists) return null;
      
      const sellerData = sellerDoc.data();
      
      if (sellerData.phoneNumber && sellerData.whatsappOptIn) {
          const companyName = sellerData.companyName || sellerData.businessName || "Supplier";
          const targetPrice = rfqData.targetPrice || "Negotiable";
          const location = rfqData.deliveryPincode || "Check App";
          const deepLink = `https://app.prochemapp.com/negotiation/${rfqId}`;
          
          const msg = `🔔 *New Negotiation Request — Prochem*\n\nHi ${companyName},\n\nA verified buyer wants to negotiate on your product:\n\n🧪 *Product:* ${rfqData.productName}\n📦 *Qty Requested:* ${rfqData.targetQuantity} ${rfqData.unit}\n💰 *Buyer's Target Price:* ₹${targetPrice} / ${rfqData.unit}\n📍 *Delivery Location:* ${location}\n\n*Negotiation ID:* #${rfqId}\n\nTo view details and chat with the buyer, please click the button below.`;
          
          await sendWhatsApp(sellerData.phoneNumber, msg, null, {
            templateName: "new_negotiation_alert",
            templateSid: "HX_NEW_NEGOTIATION_ALERT_SID", // 🚀 REPLACE WITH APPROVED SID
            templateVariables: {
                "1": companyName,
                "2": rfqData.productName,
                "3": `${rfqData.targetQuantity} ${rfqData.unit}`,
                "4": String(targetPrice),
                "5": location,
                "6": rfqId,
                "7": deepLink
            },
            type: "service",
            userId: rfqData.sellerId
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
// 🚀 TWILIO WHATSAPP INTEGRATION TEST
// ==========================================
exports.sendWhatsAppTest = functions
  .region("asia-south1") 
  .https.onRequest(async (req, res) => {
  if (!process.env.MY_PERSONAL_WHATSAPP) return res.status(500).send("MY_PERSONAL_WHATSAPP is not configured in .env yet.");
  try {
    const messageSid = await sendWhatsApp(process.env.MY_PERSONAL_WHATSAPP, "Hello! This is a test message from the new Prochem reusable WhatsApp module.", null, {
      templateName: "System_Test",
      type: "service"
    });
    res.status(200).send(`Message sent successfully! Message SID: ${messageSid}`);
  } catch (error) {
    res.status(500).send(`Failed to send message. Check Firebase logs for details. Error: ${error.message}`);
  }
});

// ==========================================
// 🚀 INBOUND WHATSAPP WEBHOOK (TWILIO)
// Handles "INTEREST" and redirects chat attempts
// ==========================================
exports.whatsappWebhook = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
  
  if (req.method !== 'POST') {
     return res.status(405).send('Method Not Allowed');
  }

  try {
    const { From, Body, WaId, ProfileName } = req.body;
    
    if (From && WaId) {
      const incomingNumber = From.replace('whatsapp:', '');
      
      let localNumber = incomingNumber;
      if (incomingNumber.startsWith('+91')) {
        localNumber = incomingNumber.substring(3);
      }

      const usersRef = admin.firestore().collection("users");
      let snapshot = await usersRef.where("phoneNumber", "==", localNumber).get();
      if (snapshot.empty) snapshot = await usersRef.where("phoneNumber", "==", incomingNumber).get();

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
         status: "received"
      });

      if (!snapshot.empty) {
        const matchedDoc = snapshot.docs[0];
        const userData = matchedDoc.data();
        
        snapshot.forEach(async (doc) => {
          const docData = doc.data();
          if (!docData.whatsappWaId) {
            await doc.ref.update({ whatsappWaId: WaId, whatsappOptIn: true });
          }
        });

        const upperCleanBody = rawBody.toUpperCase().replace(/\*/g, '');
        
        // ==========================================
        // 🚀 FLOW 1: NEW NEGOTIATION COMMAND (INTEREST)
        // ==========================================
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
                    status: 'open',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                  conversationId = newConvRef.id;
                } else {
                  conversationId = convQuery.docs[0].id;
                  await db.collection("conversations").doc(conversationId).update({
                    status: 'open',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                }

                await incomingLogRef.update({ conversationId: conversationId });

                const deepLink = `https://app.prochemapp.com/negotiation/${rfqId}`;
                await sendWhatsApp(
                  incomingNumber, 
                  `✅ Your interest is recorded. Negotiation started for ${rfqData.productName} (RFQ ID: ${rfqId}).\n\n👉 Open App to view: ${deepLink}`,
                  null,
                  { templateName: "Interest_Recorded", type: "service", userId: senderId, conversationId: conversationId }
                );

              } else if (rfqData.buyerId === senderId) {
                await sendWhatsApp(incomingNumber, `ℹ️ You are the buyer for this requirement (ID: ${rfqId}). Please wait for a supplier to initiate negotiation.`, null, { templateName: "System_Error", type: "service", userId: senderId });
              } else {
                await sendWhatsApp(incomingNumber, `❌ You are not authorized to negotiate this RFQ (ID: ${rfqId}).`, null, { templateName: "System_Error", type: "service", userId: senderId });
              }
            } else {
              await sendWhatsApp(incomingNumber, `❌ We couldn't find an RFQ with ID: ${rfqId}. It may have been fulfilled or expired.`, null, { templateName: "System_Error", type: "service", userId: senderId });
            }
          }
        } 
        // ==========================================
        // 🚀 FLOW 2: REDIRECT CHAT ATTEMPTS TO APP
        // ==========================================
        else {
          await sendWhatsApp(
            incomingNumber, 
            `🚫 Direct replies via WhatsApp are not supported.\n\nTo keep your negotiations secure and prevent missing messages, please view and reply to active chats directly inside the platform.`, 
            null, 
            { 
              templateName: "app_redirect_notice", 
              templateSid: "HX_APP_REDIRECT_NOTICE_SID", // 🚀 REPLACE WITH APPROVED SID
              type: "service", 
              userId: senderId 
            }
          );
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing incoming WhatsApp webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ==========================================
// 🚀 IN-APP MESSAGE TO WHATSAPP (TEMPLATES 2 & 3)
// ==========================================
exports.onAppMessageCreated = onDocumentCreated(
  {
    document: "conversations/{conversationId}/messages/{messageId}",
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_MESSAGING_SERVICE_SID]
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;

    const messageData = snap.data();
    const conversationId = event.params.conversationId;

    if (messageData.source !== 'app') return null;

    try {
      const db = admin.firestore();
      const convDoc = await db.collection("conversations").doc(conversationId).get();
      if (!convDoc.exists) return null;

      const convData = convDoc.data();
      if (convData.status !== 'open') return null;
      
      let targetUserId;
      if (messageData.senderRole === 'buyer') {
        targetUserId = convData.sellerUserId;
      } else if (messageData.senderRole === 'seller') {
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

        if (targetUserData.phoneNumber && targetUserData.whatsappOptIn && wantsNegotiations) {
          const deepLink = `https://app.prochemapp.com/negotiation/${convData.rfqId}`;
          let outMsg = "";
          let templateUsed = "";
          let templateSid = "";
          let templateVariables = {};

          // 🚀 TEMPLATE 3: FORMAL OFFER 
          if (messageData.isOffer && messageData.senderRole === 'seller') {
             const totalValue = (messageData.proposedQty * messageData.proposedPrice).toFixed(2);
             
             outMsg = `💰 *Formal Offer Received*\n_Prochem — Negotiation #${convData.rfqId}_\n\nThe supplier has sent you a confirmed offer:\n\n🧪 ${rfqData.productName}\n📦 Qty: ${messageData.proposedQty} ${rfqData.unit}\n💵 Price: ₹${messageData.proposedPrice}\n\n*Total Value: ₹${totalValue}* (excl. GST & fees)\n\n👉 Open in App to Accept: ${deepLink}`;
             templateUsed = "formal_offer_received";
             templateSid = "HX_FORMAL_OFFER_RECEIVED_SID"; // 🚀 REPLACE WITH APPROVED SID
             templateVariables = {
                 "1": convData.rfqId,
                 "2": rfqData.productName,
                 "3": `${messageData.proposedQty} ${rfqData.unit}`,
                 "4": String(messageData.proposedPrice),
                 "5": totalValue,
                 "6": deepLink
             };
          } 
          // 🚀 TEMPLATE 2: STANDARD CHAT MESSAGES
          else {
             const actualMsg = messageData.body || messageData.text;
             if (!actualMsg) return null;

             outMsg = `💬 *New Message — Prochem Negotiation*\n\n*Requirement:* ${rfqData.productName} (#${convData.rfqId})\n\n*Message:*\n"${actualMsg}"\n\n_To reply to this message securely, please open the app._`;
             templateUsed = "chat_message_relay";
             templateSid = "HX_CHAT_MESSAGE_RELAY_SID"; // 🚀 REPLACE WITH APPROVED SID
             templateVariables = {
                 "1": rfqData.productName,
                 "2": convData.rfqId,
                 "3": actualMsg,
                 "4": deepLink
             };
          }

          if (outMsg !== "") {
            await sendWhatsApp(targetUserData.phoneNumber, outMsg, null, {
              templateName: templateUsed,
              templateSid: templateSid,
              templateVariables: templateVariables,
              type: "service",
              userId: targetUserId,
              conversationId: conversationId
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
  { document: "rfqs/{rfqId}", 
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]
  },
  async (event) => {
     const before = event.data.before.data();
     const after = event.data.after.data();
     const rfqId = event.params.rfqId;

     if (before.status !== 'CONVERTED' && after.status === 'CONVERTED') {
         try {
             const sellerDoc = await admin.firestore().collection("users").doc(after.sellerId).get();
             if (!sellerDoc.exists) return null;
             
             const sellerData = sellerDoc.data();
             if (sellerData.phoneNumber && sellerData.whatsappOptIn) {
                 
                 const subtotal = after.agreedQuantity * after.agreedPrice;
                 const gst = subtotal * 0.18; 
                 const totalWithGst = subtotal + gst;
                 const fees = totalWithGst * 0.015; 
                 const payoutAmount = (totalWithGst - fees).toFixed(2);
                 const deepLink = `https://app.prochemapp.com/orders/${rfqId}`;
                 
                 const msg = `🎉 *Buyer Accepted Your Offer!*\n_Prochem — Negotiation #${rfqId}_\n\n*Product:* ${after.productName}\n*Quantity:* ${after.agreedQuantity} ${after.unit}\n*Agreed Price:* ₹${after.agreedPrice}\n*Your Payout:* ₹${payoutAmount} _(after Prochem fees)_\n\nThe buyer is completing payment now.\nYou will receive a dispatch notification once payment is verified.\nPlease keep stock ready.`;
                 
                 await sendWhatsApp(sellerData.phoneNumber, msg, null, {
                   templateName: "offer_accepted_alert",
                   templateSid: "HX_OFFER_ACCEPTED_ALERT_SID", // 🚀 REPLACE WITH APPROVED SID
                   templateVariables: {
                       "1": rfqId,
                       "2": after.productName,
                       "3": `${after.agreedQuantity} ${after.unit}`,
                       "4": String(after.agreedPrice),
                       "5": payoutAmount,
                       "6": deepLink
                   },
                   type: "transactional",
                   userId: after.sellerId
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
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;

    const userData = snap.data();
    const userId = event.params.userId;

    if (userData.phoneNumber && userData.whatsappOptIn) {
      try {
        const companyName = userData.companyName || "Valued User";
        
        const msg = `🧪 *Welcome to Prochem!*\n\nHi ${companyName}, your account is now active.\n\n*What you can do on Prochem:*\n• 🔍 Browse chemicals & pharma products\n• 📋 Post your requirements to get seller quotes\n• 💬 Negotiate price directly via this chat\n• 📦 Track your orders in real-time\n\nHere's how to get started:\n✅ *Step 1:* Complete your company profile\n✅ *Step 2:* Add your chemicals/products\n✅ *Step 3:* Start receiving live buyer requirements\n\n_Prochem — India's Trusted B2B Chemical Marketplace_`;
        
        await sendWhatsApp(userData.phoneNumber, msg, null, {
          templateName: "prochem_welcome", 
          templateSid: "HXcb7cb50a9601acbe304cc5a01fc1b89b", // Kept original welcome SID
          templateVariables: { "1": companyName },
          type: "marketing", 
          userId: userId
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
// 🚀 CASHFREE: CREATE ORDER
// ==========================================
exports.createCashfreeOrder = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

    const { amount, type, referenceId, customerDetails } = data;

    if (!amount || !type || !referenceId) {
      throw new functions.https.HttpsError("invalid-argument", "Amount, type, and referenceId are required.");
    }

    try {
      Cashfree.XClientId = process.env.CASHFREE_APP_ID;
      Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
      Cashfree.XEnvironment = process.env.CASHFREE_ENVIRONMENT === "PRODUCTION" 
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
          customer_name: customerDetails?.name || "Prochem User"
        },
        order_meta: {
          return_url: "https://prochem.in/payment-status?order_id={order_id}"
        },
        order_tags: {
          type: type,
          referenceId: referenceId
        }
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
        order_id: cashfreeOrderId
      };

    } catch (error) {
      console.error("Cashfree Order Error:", error.response?.data || error.message);
      throw new functions.https.HttpsError("internal", "Failed to create Cashfree order.");
    }
});

// ==========================================
// 🚀 CASHFREE: WEBHOOK LISTENER
// ==========================================
exports.cashfreeWebhook = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
    
    if (req.method !== 'POST') {
       return res.status(405).send('Method Not Allowed');
    }

    try {
      Cashfree.XClientId = process.env.CASHFREE_APP_ID;
      Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
      Cashfree.XEnvironment = process.env.CASHFREE_ENVIRONMENT === "PRODUCTION" 
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
                  createdAt: admin.firestore.FieldValue.serverTimestamp()
              });

              await admin.firestore().collection("users").doc(customerId).update({
                  subscriptionTier: "GROWTH_PACKAGE", 
                  subscriptionPlan: referenceId, 
                  subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
              });

          } else if (type === "product") {
              await admin.firestore().collection("orders").doc(referenceId).update({
                  status: "PENDING_SELLER", 
                  paymentStatus: "PAID",
                  paymentDetails: { 
                      cashfreePaymentId: paymentData.cf_payment_id, 
                      cashfreeOrderId: orderData.order_id, 
                      paidAt: admin.firestore.FieldValue.serverTimestamp() 
                  }
              });
          }
      }

      res.status(200).send("OK");

    } catch (error) {
      console.error("Webhook Error / Forgery Attempt:", error.message);
      res.status(400).send("Webhook verification failed");
    }
});