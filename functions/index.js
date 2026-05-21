const functions = require("firebase-functions/v1"); 
const { onDocumentCreated } = require("firebase-functions/v2/firestore"); 
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Expo } = require("expo-server-sdk"); 
const twilio = require("twilio"); 

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
// EXISTING RAZORPAY FUNCTIONS
// ==========================================

exports.createRazorpayOrder = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
  
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { amount, orderId } = data;

  if (!amount || !orderId) {
    throw new functions.https.HttpsError("invalid-argument", "Amount and Order ID are required.");
  }

  try {
    // 🔒 SECURE & DEPLOY-SAFE: Initialize Razorpay INSIDE the function
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: orderId,     
      payment_capture: 1,   
    };

    const order = await razorpay.orders.create(options);

    const totalAmount = amount;
    const platformFee = totalAmount * 0.0475; 
    const sellerPayout = totalAmount - (totalAmount * 0.0275); 

    await admin.firestore().collection("orders").doc(orderId).update({
      razorpayOrderId: order.id,
      paymentStatus: "PENDING",
      financials: {
        totalAmount: totalAmount,
        platformFee: platformFee,
        sellerPayout: sellerPayout,
        currency: "INR"
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      id: order.id,
      currency: order.currency,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID 
    };

  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.verifyRazorpayPayment = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
  
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { orderId, paymentId, signature, razorpayOrderId } = data;

  const body = razorpayOrderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET) 
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== signature) {
    throw new functions.https.HttpsError("permission-denied", "Invalid payment signature.");
  }

  try {
    await admin.firestore().collection("orders").doc(orderId).update({
      status: "PENDING_SELLER", 
      paymentStatus: "PAID",
      paymentDetails: {
        razorpayPaymentId: paymentId,
        razorpayOrderId: razorpayOrderId,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    });

    return { success: true, message: "Payment verified and order updated." };
    
  } catch (error) {
    console.error("Verification Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to update order status.");
  }
});


exports.createUpgradeOrder = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { amount, planId } = data;

  if (!amount || !planId) {
    throw new functions.https.HttpsError("invalid-argument", "Amount and Plan ID are required.");
  }

  try {
    // 🔒 SECURE & DEPLOY-SAFE: Initialize Razorpay INSIDE the function
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: `upg_${Date.now().toString().slice(-6)}_${context.auth.uid.substring(0, 5)}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    return {
      id: order.id,
      currency: order.currency,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID 
    };

  } catch (error) {
    console.error("Razorpay Create Upgrade Order Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.verifyUpgradePayment = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { orderId, paymentId, signature, planId } = data;

  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET) 
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== signature) {
    throw new functions.https.HttpsError("permission-denied", "Invalid payment signature.");
  }

  try {
    await admin.firestore().collection("transactions").add({
      userId: context.auth.uid,
      type: "SUBSCRIPTION_UPGRADE",
      planId: planId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      status: "SUCCESS",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await admin.firestore().collection("users").doc(context.auth.uid).update({
      subscriptionTier: "GROWTH_PACKAGE",
      subscriptionPlan: planId,
      subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: "Account upgraded successfully." };

  } catch (error) {
    console.error("Verification Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to update account status.");
  }
});


// ==========================================
// 🚀 TWILIO WHATSAPP INTEGRATION 
// ==========================================

exports.sendWhatsAppTest = functions
  .region("asia-south1") 
  .https.onRequest(async (req, res) => {
  
  // 🔒 SECURE & DEPLOY-SAFE: Initialize Twilio INSIDE the function
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return res.status(500).send("Twilio credentials not configured in .env yet.");
  }

  try {
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const message = await twilioClient.messages.create({
      body: "Hello! This is a test message from the Prochem backend.",
      from: process.env.TWILIO_PHONE_NUMBER, 
      to: process.env.MY_PERSONAL_WHATSAPP   
    });

    res.status(200).send(`Message sent successfully! Message ID: ${message.sid}`);
    
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    res.status(500).send(`Failed to send message. Error: ${error.message}`);
  }
});

// ==========================================
// 🚀 INBOUND WHATSAPP WEBHOOK (TWILIO)
// ==========================================

exports.whatsappWebhook = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
  
  // Twilio sends a POST request when a message is received
  if (req.method !== 'POST') {
     return res.status(405).send('Method Not Allowed');
  }

  try {
    // Extract incoming message details from Twilio's payload
    const { From, To, Body, WaId, ProfileName } = req.body;
    
    // Log the message to Firebase console so you can verify it works
    console.log(`📥 Incoming WhatsApp message from ${ProfileName || WaId} (${From}): ${Body}`);

    // TODO in future tasks: 
    // 1. Map the 'WaId' (WhatsApp ID) or 'From' number to a Prochem user record.
    // 2. Save the 'Body' text to a Firestore conversations collection.
    
    // You MUST send a 200 OK response to Twilio so they know the message was received successfully
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ Error processing incoming WhatsApp webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});