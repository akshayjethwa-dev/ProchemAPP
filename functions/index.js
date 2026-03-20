const functions = require("firebase-functions/v1"); // 🚀 FIX: Explicitly require v1 here
const { onDocumentCreated } = require("firebase-functions/v2/firestore"); 
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Expo } = require("expo-server-sdk"); 

admin.initializeApp();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: "YOUR_RAZORPAY_KEY_ID",
  key_secret: "YOUR_RAZORPAY_KEY_SECRET",
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
      key: "YOUR_RAZORPAY_KEY_ID"
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
    .createHmac("sha256", "YOUR_RAZORPAY_KEY_SECRET") 
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