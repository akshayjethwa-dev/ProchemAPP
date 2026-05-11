const functions = require("firebase-functions/v1"); // 🚀 FIX: Explicitly require v1 here
const { onDocumentCreated } = require("firebase-functions/v2/firestore"); 
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Expo } = require("expo-server-sdk"); 

admin.initializeApp();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: "rzp_live_SnwvCwNukKeeTk",
  key_secret: "4EU9V8Ms362d696xpVuoeYrf",
});

// Create a new Expo SDK client
const expo = new Expo();

// ==========================================
// 🚀 PUSH NOTIFICATION TRIGGER (Gen 2 - INDIA REGION)
// ==========================================
exports.sendPushNotification = onDocumentCreated(
  {
    document: "notifications/{docId}",
    region: "asia-south1" // Mumbai, India
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
// EXISTING RAZORPAY FUNCTIONS (Gen 1 - INDIA REGION)
// ==========================================

exports.createRazorpayOrder = functions
  .region("asia-south1") // Mumbai, India
  .https.onCall(async (data, context) => {
  
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { amount, orderId } = data;

  if (!amount || !orderId) {
    throw new functions.https.HttpsError("invalid-argument", "Amount and Order ID are required.");
  }

  try {
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
      key: "rzp_live_SnwvCwNukKeeTk"
    };

  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.verifyRazorpayPayment = functions
  .region("asia-south1") // Mumbai, India
  .https.onCall(async (data, context) => {
  
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { orderId, paymentId, signature, razorpayOrderId } = data;

  const body = razorpayOrderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", "4EU9V8Ms362d696xpVuoeYrf") 
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

// ==========================================
// UPGRADE TO PREMIUM PLANS (RAZORPAY)
// ==========================================

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
      key: "rzp_live_SnwvCwNukKeeTk" // Ensure your real key is here
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

  // Verify Signature
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", "4EU9V8Ms362d696xpVuoeYrf") // Ensure real secret is here
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== signature) {
    throw new functions.https.HttpsError("permission-denied", "Invalid payment signature.");
  }

  try {
    // 1. Log the transaction in a new collection
    await admin.firestore().collection("transactions").add({
      userId: context.auth.uid,
      type: "SUBSCRIPTION_UPGRADE",
      planId: planId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      status: "SUCCESS",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Automatically Upgrade the User's Profile
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