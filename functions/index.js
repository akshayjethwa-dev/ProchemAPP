// File: functions/index.js
const functions = require("firebase-functions/v1"); 
const { onDocumentCreated } = require("firebase-functions/v2/firestore"); 
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Expo } = require("expo-server-sdk"); 

// Import the reusable WhatsApp service
const { sendWhatsApp } = require("./whatsappService");

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
// 🚀 NEW: TASK 4.1 - BROADCAST NEW REQUIREMENTS 
// ==========================================
exports.onRequirementCreated = onDocumentCreated(
  {
    document: "customRequirements/{docId}",
    region: "asia-south1" 
  }, 
  async (event) => {
    const snap = event.data;
    if (!snap) return null; 

    const reqData = snap.data();
    const docId = event.params.docId;
    
    // Extract targetPrice along with the other fields
    const { buyerId, productName, quantity, unit, targetPrice } = reqData;

    try {
      // 1. Fetch eligible users (must be opted into WhatsApp)
      const usersSnap = await admin.firestore().collection("users")
        .where("whatsappOptIn", "==", true)
        .get();
      
      const sendPromises = [];

      // Determine price format (defaults to Negotiable if missing)
      const displayPrice = targetPrice ? `₹${targetPrice}` : "Negotiable";
      const displayQty = `${quantity} ${unit}`;

      usersSnap.forEach((doc) => {
        const userData = doc.data();
        const userId = doc.id;

        // Ensure user is a seller or dual role
        const isSeller = userData.userType === 'seller' || userData.userType === 'dual';

        // CONSTRAINT 1 & 2: Do not send to the creator (buyerId) 
        // AND do not send to excluded sellers (if they are already negotiating)
        const isExcluded = 
          userId === buyerId || 
          (reqData.excludedSellerIds && reqData.excludedSellerIds.includes(userId)) || 
          userId === reqData.excludedSellerId;

        if (isSeller && !isExcluded && userData.phoneNumber) {
          
          // Formatted exactly to match the new Twilio Template
          const msg = `🔔 *New Buyer Requirement — Prochem*\n\nA buyer is looking for:\n\n🧪 *Product:* ${productName}\n📦 *Quantity:* ${displayQty}\n💰 *Target Price:* ${displayPrice}\n\n*Requirement ID:* #${docId}\n\nReply *INTEREST ${docId}* to start negotiation via Prochem.\n\n_(This requirement is live — respond quickly to close the deal)_\n\n_Prochem Marketplace_`;
          
          // Prepare the promise to send WhatsApp
          sendPromises.push(
            sendWhatsApp(userData.phoneNumber, msg)
              .catch(err => console.error(`Failed to send alert to ${userData.phoneNumber}`, err))
          );
        }
      });

      // 2. Simple Batching: Process in chunks of 10 to avoid hitting Twilio rate limits
      const chunkSize = 10;
      for (let i = 0; i < sendPromises.length; i += chunkSize) {
        const chunk = sendPromises.slice(i, i + chunkSize);
        await Promise.all(chunk);
      }

      console.log(`✅ Broadcasted requirement ${docId} to eligible sellers.`);
      return true;

    } catch (error) {
      console.error("❌ Error broadcasting requirement:", error);
      return null;
    }
});

// ==========================================
// EXISTING RAZORPAY FUNCTIONS
// ==========================================
exports.createRazorpayOrder = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { amount, orderId } = data;
  if (!amount || !orderId) throw new functions.https.HttpsError("invalid-argument", "Amount and Order ID are required.");

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = { amount: amount * 100, currency: "INR", receipt: orderId, payment_capture: 1 };
    const order = await razorpay.orders.create(options);

    const totalAmount = amount;
    const platformFee = totalAmount * 0.0475; 
    const sellerPayout = totalAmount - (totalAmount * 0.0275); 

    await admin.firestore().collection("orders").doc(orderId).update({
      razorpayOrderId: order.id,
      paymentStatus: "PENDING",
      financials: { totalAmount, platformFee, sellerPayout, currency: "INR" },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { id: order.id, currency: order.currency, amount: order.amount, key: process.env.RAZORPAY_KEY_ID };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.verifyRazorpayPayment = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { orderId, paymentId, signature, razorpayOrderId } = data;

  const body = razorpayOrderId + "|" + paymentId;
  const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");

  if (expectedSignature !== signature) throw new functions.https.HttpsError("permission-denied", "Invalid payment signature.");

  try {
    await admin.firestore().collection("orders").doc(orderId).update({
      status: "PENDING_SELLER", 
      paymentStatus: "PAID",
      paymentDetails: { razorpayPaymentId: paymentId, razorpayOrderId: razorpayOrderId, paidAt: admin.firestore.FieldValue.serverTimestamp() }
    });

    try {
      const userId = context.auth.uid;
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (userData && userData.whatsappOptIn === true && userData.phoneNumber) {
        await sendWhatsApp(userData.phoneNumber, `🎉 Prochem Alert: Your payment for order #${orderId.substring(0, 6)} was successful. The seller has been notified!`);
      }
    } catch (waError) {
      console.error("Error sending WhatsApp notification:", waError);
    }

    return { success: true, message: "Payment verified and order updated." };
  } catch (error) {
    throw new functions.https.HttpsError("internal", "Failed to update order status.");
  }
});

exports.createUpgradeOrder = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { amount, planId } = data;
  if (!amount || !planId) throw new functions.https.HttpsError("invalid-argument", "Amount and Plan ID are required.");

  try {
    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const options = { amount: amount * 100, currency: "INR", receipt: `upg_${Date.now().toString().slice(-6)}_${context.auth.uid.substring(0, 5)}`, payment_capture: 1 };
    const order = await razorpay.orders.create(options);
    return { id: order.id, currency: order.currency, amount: order.amount, key: process.env.RAZORPAY_KEY_ID };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.verifyUpgradePayment = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  const { orderId, paymentId, signature, planId } = data;

  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");

  if (expectedSignature !== signature) throw new functions.https.HttpsError("permission-denied", "Invalid payment signature.");

  try {
    await admin.firestore().collection("transactions").add({
      userId: context.auth.uid, type: "SUBSCRIPTION_UPGRADE", planId, razorpayOrderId: orderId, razorpayPaymentId: paymentId, status: "SUCCESS", createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await admin.firestore().collection("users").doc(context.auth.uid).update({
      subscriptionTier: "GROWTH_PACKAGE", subscriptionPlan: planId, subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    try {
      const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
      const userData = userDoc.data();
      if (userData && userData.whatsappOptIn === true && userData.phoneNumber) {
        await sendWhatsApp(userData.phoneNumber, `🚀 Prochem Alert: Your account has been upgraded to the ${planId} plan successfully! Enjoy your new features.`);
      }
    } catch (waError) {
      console.error("Error sending upgrade WhatsApp notification:", waError);
    }

    return { success: true, message: "Account upgraded successfully." };
  } catch (error) {
    throw new functions.https.HttpsError("internal", "Failed to update account status.");
  }
});

// ==========================================
// 🚀 TWILIO WHATSAPP INTEGRATION 
// ==========================================
exports.sendWhatsAppTest = functions
  .region("asia-south1") 
  .https.onRequest(async (req, res) => {
  if (!process.env.MY_PERSONAL_WHATSAPP) return res.status(500).send("MY_PERSONAL_WHATSAPP is not configured in .env yet.");
  try {
    const messageSid = await sendWhatsApp(process.env.MY_PERSONAL_WHATSAPP, "Hello! This is a test message from the new Prochem reusable WhatsApp module.");
    res.status(200).send(`Message sent successfully! Message SID: ${messageSid}`);
  } catch (error) {
    res.status(500).send(`Failed to send message. Check Firebase logs for details. Error: ${error.message}`);
  }
});

// ==========================================
// 🚀 INBOUND WHATSAPP WEBHOOK (TWILIO)
// ==========================================
exports.whatsappWebhook = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
  
  if (req.method !== 'POST') {
     return res.status(405).send('Method Not Allowed');
  }

  try {
    const { From, To, Body, WaId, ProfileName } = req.body;
    console.log(`📥 Incoming WhatsApp message from ${ProfileName || WaId} (${From}): ${Body}`);
    
    if (From && WaId) {
      // Remove 'whatsapp:' prefix to match phone formats in DB
      const incomingNumber = From.replace('whatsapp:', '');
      
      // Handle India country code format
      let localNumber = incomingNumber;
      if (incomingNumber.startsWith('+91')) {
        localNumber = incomingNumber.substring(3);
      }

      const usersRef = admin.firestore().collection("users");
      let snapshot = await usersRef.where("phoneNumber", "==", localNumber).get();
      if (snapshot.empty) snapshot = await usersRef.where("phoneNumber", "==", incomingNumber).get();

      if (!snapshot.empty) {
        const matchedDoc = snapshot.docs[0];
        const userData = matchedDoc.data();

        // Profile Linking
        snapshot.forEach(async (doc) => {
          const docData = doc.data();
          if (!docData.whatsappWaId) {
            await doc.ref.update({ whatsappWaId: WaId, whatsappOptIn: true });
            console.log(`✅ Linked WhatsApp WaId ${WaId} to existing user ${doc.id}`);
          }
        });

        // ==========================================
        // 🚀 NEW: Task 4.1 - Parse "INTEREST <ID>" 
        // ==========================================
        // Clean the incoming body to remove markdown asterisks in case they copy-pasted
        const cleanBody = Body.trim().toUpperCase().replace(/\*/g, '');
        
        if (cleanBody.startsWith("INTEREST ")) {
          const reqId = cleanBody.split(" ")[1];
          
          if (reqId) {
            const reqRef = admin.firestore().collection("customRequirements").doc(reqId);
            const reqSnap = await reqRef.get();

            if (reqSnap.exists) {
              const reqData = reqSnap.data();

              // Create a SupplierQuote to log the interest
              await admin.firestore().collection("supplierQuotes").add({
                leadId: reqId,
                productName: reqData.productName,
                supplierId: matchedDoc.id,
                supplierName: userData.companyName || userData.businessName || "Prochem Supplier",
                status: "PENDING",
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              });

              await sendWhatsApp(
                incomingNumber, 
                `✅ We have registered your interest for ${reqData.productName} (Req ID: ${reqId}). You can now negotiate this deal in the Prochem app.`
              );
            } else {
              await sendWhatsApp(
                incomingNumber, 
                `❌ We couldn't find a requirement with ID: ${reqId}. It may have been fulfilled or expired.`
              );
            }
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