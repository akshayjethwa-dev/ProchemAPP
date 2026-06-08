// File: functions/index.js
const functions = require("firebase-functions/v1"); // 🟢 Added back to fix the ReferenceError
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore"); 
const admin = require("firebase-admin");
const { Expo } = require("expo-server-sdk"); 
const { Cashfree } = require("cashfree-pg"); // 🚀 Cashfree SDK Import

// Import the reusable WhatsApp service
const { sendWhatsApp } = require("./whatsappService");

const { defineSecret } = require("firebase-functions/params");
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN   = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");

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
// 🚀 BROADCAST NEW REQUIREMENTS (EXISTING)
// ==========================================
exports.onRequirementCreated = onDocumentCreated(
  {
    document: "customRequirements/{docId}",
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]
  }, 
  async (event) => {
    const snap = event.data;
    if (!snap) return null; 

    const reqData = snap.data();
    const docId = event.params.docId;
    
    const { buyerId, productName, quantity, unit, targetPrice } = reqData;

    try {
      const usersSnap = await admin.firestore().collection("users")
        .where("whatsappOptIn", "==", true)
        .get();
      
      const sendPromises = [];
      const displayPrice = targetPrice ? `₹${targetPrice}` : "Negotiable";
      const displayQty = `${quantity} ${unit}`;

      usersSnap.forEach((doc) => {
        const userData = doc.data();
        const userId = doc.id;

        const isSeller = userData.userType === 'seller' || userData.userType === 'dual';
        const isExcluded = 
          userId === buyerId || 
          (reqData.excludedSellerIds && reqData.excludedSellerIds.includes(userId)) || 
          userId === reqData.excludedSellerId;

        const prefs = userData.whatsappPreferences || {};
        const wantsMarketAlerts = prefs.marketAlerts !== false; // defaults to true

        if (isSeller && !isExcluded && userData.phoneNumber && wantsMarketAlerts) {
          const msg = `🔔 *New Buyer Requirement — Prochem*\n\nA buyer is looking for:\n\n🧪 *Product:* ${productName}\n📦 *Quantity:* ${displayQty}\n💰 *Target Price:* ${displayPrice}\n\n*Requirement ID:* #${docId}\n\nReply *INTEREST ${docId}* to start negotiation via Prochem.\n\n_(This requirement is live — respond quickly to close the deal)_\n\n_Prochem Marketplace_`;
          
          sendPromises.push(
            sendWhatsApp(userData.phoneNumber, msg, null, {
              templateName: "Broadcast_New_Requirement",
              type: "marketing",
              userId: userId
            }).catch(err => console.error(`Failed to send alert to ${userData.phoneNumber}`, err))
          );
        }
      });

      const chunkSize = 10;
      for (let i = 0; i < sendPromises.length; i += chunkSize) {
        const chunk = sendPromises.slice(i, i + chunkSize);
        await Promise.all(chunk);
      }

      return true;

    } catch (error) {
      console.error("❌ Error broadcasting requirement:", error);
      return null;
    }
});

// ==========================================
// 🚀 TEMPLATE 1: NEW NEGOTIATION REQUEST
// Triggered when a Buyer creates a specific direct RFQ
// ==========================================
exports.onDirectRfqCreated = onDocumentCreated(
  { document: "rfqs/{rfqId}", 
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]
  },
  async (event) => {
    const rfqData = event.data.data();
    const rfqId = event.params.rfqId;

    if (!rfqData.sellerId) return null; // Ignore if no specific seller

    try {
      const sellerDoc = await admin.firestore().collection("users").doc(rfqData.sellerId).get();
      if (!sellerDoc.exists) return null;
      
      const sellerData = sellerDoc.data();
      
      if (sellerData.phoneNumber && sellerData.whatsappOptIn) {
          const companyName = sellerData.companyName || sellerData.businessName || "Supplier";
          const targetPrice = rfqData.targetPrice || "Negotiable";
          const location = rfqData.deliveryPincode || "Check App";
          
          // EXACT match for Twilio Template 1
          const msg = `🔔 *New Negotiation Request — Prochem*\n\nHi ${companyName},\n\nA verified buyer wants to negotiate on your product:\n\n🧪 *Product:* ${rfqData.productName}\n📦 *Qty Requested:* ${rfqData.targetQuantity} ${rfqData.unit}\n💰 *Buyer's Target Price:* ₹${targetPrice} / ${rfqData.unit}\n📍 *Delivery Location:* ${location}\n\n*Negotiation ID:* #${rfqId}\n\nThe buyer is waiting. \nYou can negotiate directly here on WhatsApp.\nAll conversations go through Prochem — your contact details stay private.\n\n_Reply to this message to begin negotiation._\n\n_Prochem Marketplace_`;
          
          await sendWhatsApp(sellerData.phoneNumber, msg, null, {
            templateName: "Template_1_New_Rfq",
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
// 🚀 TWILIO WHATSAPP INTEGRATION 
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
// Matches Templates 2 & 3
// ==========================================
exports.whatsappWebhook = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
  
  if (req.method !== 'POST') {
     return res.status(405).send('Method Not Allowed');
  }

  try {
    const { From, Body, WaId, ProfileName } = req.body;
    console.log(`📥 Incoming WhatsApp message from ${ProfileName || WaId} (${From}): ${Body}`);
    
    if (From && WaId) {
      const incomingNumber = From.replace('whatsapp:', '');
      
      let localNumber = incomingNumber;
      if (incomingNumber.startsWith('+91')) {
        localNumber = incomingNumber.substring(3);
      }

      const usersRef = admin.firestore().collection("users");
      let snapshot = await usersRef.where("phoneNumber", "==", localNumber).get();
      if (snapshot.empty) snapshot = await usersRef.where("phoneNumber", "==", incomingNumber).get();

      // 🚀 INBOUND LOGGING - Write incoming log first
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
        
        // Profile Linking
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
                const convQuery = await db.collection("conversations")
                  .where("rfqId", "==", rfqId)
                  .get();

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

                // Update inbound log with conversationId
                await incomingLogRef.update({ conversationId: conversationId });

                await sendWhatsApp(
                  incomingNumber, 
                  `✅ Your interest is recorded. Negotiation started for ${rfqData.productName} (RFQ ID: ${rfqId}).\n\nSend your offer here to reply to the buyer.`,
                  null,
                  { templateName: "Interest_Recorded", type: "service", userId: senderId, conversationId: conversationId }
                );

                const buyerDoc = await db.collection("users").doc(rfqData.buyerId).get();
                if (buyerDoc.exists) {
                  const buyerData = buyerDoc.data();
                  if (buyerData.phoneNumber && buyerData.whatsappOptIn) {
                    const sellerName = userData.companyName || userData.businessName || "A supplier";
                    await sendWhatsApp(
                      buyerData.phoneNumber,
                      `🔔 *Prochem Negotiation Alert*\n\n${sellerName} has responded to your requirement for ${rfqData.productName} (RFQ ID: ${rfqId}).\n\nReply here to negotiate via Prochem.`,
                      null,
                      { templateName: "Seller_Interest_Alert", type: "service", userId: rfqData.buyerId, conversationId: conversationId }
                    );
                  }
                }

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
        // 🚀 FLOW 2: RELAY ONGOING MESSAGES (TEMPLATE 2 & 3)
        // ==========================================
        else {
          const buyerConvsSnap = await db.collection("conversations").where("buyerUserId", "==", senderId).get();
          const sellerConvsSnap = await db.collection("conversations").where("sellerUserId", "==", senderId).get();

          let allConversations = [];
          buyerConvsSnap.forEach(doc => allConversations.push({ id: doc.id, ...doc.data() }));
          sellerConvsSnap.forEach(doc => allConversations.push({ id: doc.id, ...doc.data() }));

          if (allConversations.length > 0) {
            allConversations.sort((a, b) => {
              const timeA = a.updatedAt ? (typeof a.updatedAt.toMillis === 'function' ? a.updatedAt.toMillis() : Number(a.updatedAt)) : 0;
              const timeB = b.updatedAt ? (typeof b.updatedAt.toMillis === 'function' ? b.updatedAt.toMillis() : Number(b.updatedAt)) : 0;
              return timeB - timeA; 
            });

            const openConversations = allConversations.filter(c => c.status === 'open');

            if (openConversations.length > 0) {
              const currentConv = openConversations[0];
              const convId = currentConv.id;

              // Update inbound log with conversationId
              await incomingLogRef.update({ conversationId: convId });

              const isSenderBuyer = currentConv.buyerUserId === senderId;
              const senderRole = isSenderBuyer ? 'buyer' : 'seller';
              const targetId = isSenderBuyer ? currentConv.sellerUserId : currentConv.buyerUserId;
              const direction = isSenderBuyer ? 'toSeller' : 'toBuyer';

              await db.collection("conversations").doc(convId).collection("messages").add({
                senderRole: senderRole,
                direction: direction,
                body: rawBody, 
                text: rawBody, 
                senderId: senderId, 
                isBuyer: isSenderBuyer, 
                source: 'whatsapp',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
              });

              await db.collection("conversations").doc(convId).update({
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });

              // Fetch target user and RFQ data for templated string
              const targetDoc = await db.collection("users").doc(targetId).get();
              const rfqDoc = await db.collection("rfqs").doc(currentConv.rfqId).get();

              if (targetDoc.exists && rfqDoc.exists) {
                const targetData = targetDoc.data();
                const rfqData = rfqDoc.data();

                if (targetData.phoneNumber && targetData.whatsappOptIn) {
                  let outMsg = "";
                  let templateUsed = "";

                  if (isSenderBuyer) {
                    // Send to Seller (Template 3 Format)
                    outMsg = `💬 *New Message — Prochem Negotiation*\n\n*Requirement:* ${rfqData.productName} (#${currentConv.rfqId})\n\n*Buyer says:*\n"${rawBody}"\n\n_Reply here to respond. Prochem securely relays your message to the buyer._`;
                    templateUsed = "Template_3_Relay";
                  } else {
                    // Send to Buyer (Template 2 Format)
                    outMsg = `💬 *New Message — Prochem Negotiation*\n\n*Requirement:* ${rfqData.productName} (#${currentConv.rfqId})\n\n*Seller says:*\n"${rawBody}"\n\n_Reply here to respond. Prochem securely relays your message to the seller._`;
                    templateUsed = "Template_2_Relay";
                  }

                  await sendWhatsApp(targetData.phoneNumber, outMsg, null, {
                    templateName: templateUsed,
                    type: "service",
                    userId: targetId,
                    conversationId: convId
                  });
                }
              }
            } else {
              await sendWhatsApp(incomingNumber, `🚫 This negotiation is closed. Start a new negotiation from the Prochem app.`, null, { templateName: "System_Error", type: "service", userId: senderId });
            }
          } else {
            await sendWhatsApp(incomingNumber, `ℹ️ You don't have any active negotiations right now. If you're responding to an alert, please use the exact format: INTEREST <RFQ_ID>`, null, { templateName: "System_Error", type: "service", userId: senderId });
          }
        }
      } else {
        console.log(`ℹ️ Received message from unrecognized number: ${incomingNumber}`);
      }
    }

    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ Error processing incoming WhatsApp webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ==========================================
// 🚀 IN-APP MESSAGE TO WHATSAPP (TEMPLATES 2, 3, 4)
// ==========================================
exports.onAppMessageCreated = onDocumentCreated(
  {
    document: "conversations/{conversationId}/messages/{messageId}",
    region: "asia-south1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;

    const messageData = snap.data();
    const conversationId = event.params.conversationId;

    if (messageData.source !== 'app') {
      return null;
    }

    try {
      const db = admin.firestore();
      const convDoc = await db.collection("conversations").doc(conversationId).get();
      if (!convDoc.exists) return null;

      const convData = convDoc.data();

      if (convData.status !== 'open') {
        console.log(`Conversation ${conversationId} is closed. Skipping WhatsApp forward.`);
        return null;
      }
      
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
        const wantsNegotiations = prefs.negotiations !== false; // defaults to true

        if (targetUserData.phoneNumber && targetUserData.whatsappOptIn && wantsNegotiations) {
          let outMsg = "";
          let templateUsed = "Message_Relay";

          // 🚀 TEMPLATE 4: FORMAL OFFER (Only if Seller creates an offer in-app)
          if (messageData.isOffer && messageData.senderRole === 'seller') {
             const totalValue = (messageData.proposedQty * messageData.proposedPrice).toFixed(2);
             const deepLink = `https://app.prochem.in/negotiation/${convData.rfqId}`;
             
             outMsg = `💰 *Formal Offer Received*\n_Prochem — Negotiation #${convData.rfqId}_\n\nThe supplier has sent you a confirmed offer:\n\n🧪 ${rfqData.productName}                  \n📦 Qty:    ${messageData.proposedQty} ${rfqData.unit}    \n💵 Price:  ₹${messageData.proposedPrice} / ${rfqData.unit} \n\n*Total Value: ₹${totalValue}* (excl. GST & platform fees)\nGo to the app, accept the offer, and make a payment to confirm your order.\n👉 Open in App: ${deepLink}`;
             templateUsed = "Template_4_Formal_Offer";
          } 
          // 🚀 TEMPLATE 2 & 3: STANDARD CHAT MESSAGES
          else {
             const actualMsg = messageData.body || messageData.text;
             if (!actualMsg) return null;

             if (messageData.senderRole === 'buyer') {
                 // Send to Seller (Template 3 Format)
                 outMsg = `💬 *New Message — Prochem Negotiation*\n\n*Requirement:* ${rfqData.productName} (#${convData.rfqId})\n\n*Buyer says:*\n"${actualMsg}"\n\n_Reply here to respond. Prochem securely relays your message to the buyer._`;
                 templateUsed = "Template_3_Relay";
             } else {
                 // Send to Buyer (Template 2 Format)
                 outMsg = `💬 *New Message — Prochem Negotiation*\n\n*Requirement:* ${rfqData.productName} (#${convData.rfqId})\n\n*Seller says:*\n"${actualMsg}"\n\n_Reply here to respond. Prochem securely relays your message to the seller._`;
                 templateUsed = "Template_2_Relay";
             }
          }

          if (outMsg !== "") {
            await sendWhatsApp(targetUserData.phoneNumber, outMsg, null, {
              templateName: templateUsed,
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
// 🚀 TEMPLATE 5: OFFER ACCEPTED
// Triggered when RFQ status changes to CONVERTED
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

     // Ensure it only triggers once when status specifically switches to CONVERTED
     if (before.status !== 'CONVERTED' && after.status === 'CONVERTED') {
         try {
             const sellerDoc = await admin.firestore().collection("users").doc(after.sellerId).get();
             if (!sellerDoc.exists) return null;
             
             const sellerData = sellerDoc.data();
             if (sellerData.phoneNumber && sellerData.whatsappOptIn) {
                 
                 // Standard Prochem Payout Calculation based on logic:
                 const subtotal = after.agreedQuantity * after.agreedPrice;
                 const gst = subtotal * 0.18; // 18% standard GST
                 const totalWithGst = subtotal + gst;
                 const fees = totalWithGst * 0.015; // Platform(1%) + Safety(0.25%) + Freight(0.25%) = 1.5% deduction
                 const payoutAmount = (totalWithGst - fees).toFixed(2);
                 
                 // EXACT match for Twilio Template 5
                 const msg = `🎉 *Buyer Accepted Your Offer!*\n_Prochem — Negotiation #${rfqId}_\n\n*Product:* ${after.productName}\n*Quantity:* ${after.agreedQuantity} ${after.unit}\n*Agreed Price:* ₹${after.agreedPrice} / ${after.unit}\n*Your Payout:* ₹${payoutAmount} _(after Prochem fees)_\n\nThe buyer is completing payment now.\nYou will receive a dispatch notification once payment is verified by Prochem.\n\nPlease keep stock ready.`;
                 
                 await sendWhatsApp(sellerData.phoneNumber, msg, null, {
                   templateName: "Template_5_Offer_Accepted",
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
// Triggered when a new user creates an account
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

    // Ensure the user has a phone number and opted in
    if (userData.phoneNumber && userData.whatsappOptIn) {
      try {
        const companyName = userData.companyName || "Valued User";
        
        // Exact formatting matching the approved Twilio template, mapping companyName to {{1}}
        const msg = `🧪 *Welcome to Prochem!*

Hi ${companyName}, your account is now active.

*What you can do on Prochem:*
• 🔍 Browse chemicals & pharma products
• 📋 Post your requirements to get seller quotes
• 💬 Negotiate price directly via this chat
• 📦 Track your orders in real-time

Here's how to get started:
✅ *Step 1:* Complete your company profile
✅ *Step 2:* Add your chemicals/products
✅ *Step 3:* Start receiving live buyer requirements

_Prochem — India's Trusted B2B Chemical Marketplace_`;
        
        // Use "marketing" for Twilio/WhatsApp category routing
        await sendWhatsApp(userData.phoneNumber, msg, null, {
          templateName: "prochem_welcome", 
          type: "marketing", 
          userId: userId
        });
        
        console.log(`✅ Welcome WhatsApp sent to ${userData.phoneNumber}`);
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

    // type can be 'subscription' or 'product'
    // referenceId is the plan ID or the order ID
    const { amount, type, referenceId, customerDetails } = data;

    if (!amount || !type || !referenceId) {
      throw new functions.https.HttpsError("invalid-argument", "Amount, type, and referenceId are required.");
    }

    try {
      // 1. Configure SDK
      Cashfree.XClientId = process.env.CASHFREE_APP_ID;
      Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
      Cashfree.XEnvironment = process.env.CASHFREE_ENVIRONMENT === "PRODUCTION" 
          ? Cashfree.Environment.PRODUCTION 
          : Cashfree.Environment.SANDBOX;

      // 2. Generate a unique Cashfree Order ID
      const cashfreeOrderId = `cf_${type}_${referenceId}_${Date.now()}`.substring(0, 50);

      // 3. Create Request Object
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

      // 4. Call Cashfree API
      const response = await Cashfree.PGCreateOrder("2023-08-01", request);

      // 5. If it's a product, update the initial order document with the new Cashfree ID
      if (type === "product") {
        await admin.firestore().collection("orders").doc(referenceId).update({
          cashfreeOrderId: cashfreeOrderId,
          paymentStatus: "PENDING_GATEWAY",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Return the payment_session_id back to the React Native frontend
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
    
    // Webhooks must be POST requests
    if (req.method !== 'POST') {
       return res.status(405).send('Method Not Allowed');
    }

    try {
      Cashfree.XClientId = process.env.CASHFREE_APP_ID;
      Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
      Cashfree.XEnvironment = process.env.CASHFREE_ENVIRONMENT === "PRODUCTION" 
          ? Cashfree.Environment.PRODUCTION 
          : Cashfree.Environment.SANDBOX;

      // 1. Extract Headers required for Signature Verification
      const signature = req.headers["x-webhook-signature"];
      const timestamp = req.headers["x-webhook-timestamp"];

      if (!signature || !timestamp) {
         return res.status(400).send("Missing security headers");
      }

      // 2. Verify Signature to prevent fraud
      // SDK automatically throws an error if signature is invalid
      Cashfree.PGVerifyWebhookSignature(signature, req.rawBody.toString(), timestamp);

      const payload = req.body;
      console.log("Verified Cashfree Webhook:", JSON.stringify(payload));

      // 3. Process the Payment Success event
      if (payload.type === "PAYMENT_SUCCESS_WEBHOOK") {
          const orderData = payload.data.order;
          const paymentData = payload.data.payment;
          
          const tags = orderData.order_tags || {};
          const type = tags.type;                  // 'subscription' or 'product'
          const referenceId = tags.referenceId;    // Plan ID or Order ID
          const customerId = orderData.customer_details.customer_id;

          if (type === "subscription") {
              // Mark user as premium
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
              // Update physical product order to PAID
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

      // 4. Acknowledge Receipt - Critical so Cashfree doesn't retry
      res.status(200).send("OK");

    } catch (error) {
      console.error("Webhook Error / Forgery Attempt:", error.message);
      // Return 400 if verification fails so it doesn't process forged data
      res.status(400).send("Webhook verification failed");
    }
});