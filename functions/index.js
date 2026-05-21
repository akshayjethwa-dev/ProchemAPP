// File: functions/index.js
const functions = require("firebase-functions/v1"); 
const { onDocumentCreated } = require("firebase-functions/v2/firestore"); 
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Expo } = require("expo-server-sdk"); 
const twilio = require("twilio"); 

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
    // 1. Update order status in Firestore
    await admin.firestore().collection("orders").doc(orderId).update({
      status: "PENDING_SELLER", 
      paymentStatus: "PAID",
      paymentDetails: {
        razorpayPaymentId: paymentId,
        razorpayOrderId: razorpayOrderId,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    });

    // ==========================================
    // 🚀 NEW: WHATSAPP OPT-IN CHECK & NOTIFICATION
    // ==========================================
    try {
      const userId = context.auth.uid;
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();

      // Check the exact opt-in boolean and ensure they provided a phone number
      if (userData && userData.whatsappOptIn === true && userData.phoneNumber) {
        await sendWhatsApp(
          userData.phoneNumber, 
          `🎉 Prochem Alert: Your payment for order #${orderId.substring(0, 6)} was successful. The seller has been notified!`
        );
      } else {
        console.log(`Skipped WhatsApp for ${userId} - Opt-in is false or phone missing`);
      }
    } catch (waError) {
      console.error("Error sending WhatsApp notification:", waError);
      // We catch the error so the payment verification still completes successfully even if Twilio fails
    }

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

    // ==========================================
    // 🚀 NEW: WHATSAPP OPT-IN CHECK FOR UPGRADES
    // ==========================================
    try {
      const userId = context.auth.uid;
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (userData && userData.whatsappOptIn === true && userData.phoneNumber) {
        await sendWhatsApp(
          userData.phoneNumber, 
          `🚀 Prochem Alert: Your account has been upgraded to the ${planId} plan successfully! Enjoy your new features.`
        );
      }
    } catch (waError) {
      console.error("Error sending upgrade WhatsApp notification:", waError);
    }

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
  
  if (!process.env.MY_PERSONAL_WHATSAPP) {
    return res.status(500).send("MY_PERSONAL_WHATSAPP is not configured in .env yet.");
  }

  try {
    const messageSid = await sendWhatsApp(
      process.env.MY_PERSONAL_WHATSAPP, 
      "Hello! This is a test message from the new Prochem reusable WhatsApp module."
    );

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
    
    // ==========================================
    // 🚀 NEW: INBOUND PROFILE LINKING (Task 2.2)
    // ==========================================
    if (From && WaId) {
      // Remove 'whatsapp:' prefix to match phone formats in DB
      const incomingNumber = From.replace('whatsapp:', '');
      
      // Handle India country code format just in case it was saved differently
      let localNumber = incomingNumber;
      if (incomingNumber.startsWith('+91')) {
        localNumber = incomingNumber.substring(3);
      }

      const usersRef = admin.firestore().collection("users");
      
      // Check if user exists with local (10-digit) or international number
      let snapshot = await usersRef.where("phoneNumber", "==", localNumber).get();
      if (snapshot.empty) {
        snapshot = await usersRef.where("phoneNumber", "==", incomingNumber).get();
      }

      if (!snapshot.empty) {
        snapshot.forEach(async (doc) => {
          const userData = doc.data();
          
          // If we haven't saved their WaId yet, save it now
          if (!userData.whatsappWaId) {
            await doc.ref.update({
              whatsappWaId: WaId,
              // If they messaged us directly, we can assume they implicitly opted in to chat
              whatsappOptIn: true 
            });
            console.log(`✅ Linked WhatsApp WaId ${WaId} to existing user ${doc.id}`);
          }
        });
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