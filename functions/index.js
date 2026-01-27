const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");

admin.initializeApp();

// Initialize Razorpay
// If using config variables: functions.config().razorpay.key_id
// For now, you can hardcode them for testing, but switch to config later.
const razorpay = new Razorpay({
  key_id: "YOUR_RAZORPAY_KEY_ID",
  key_secret: "YOUR_RAZORPAY_KEY_SECRET",
});

/**
 * 1. CREATE ORDER
 * Call this from the App when user clicks "Checkout"
 */
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
  // Security: Ensure user is logged in
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { amount, orderId } = data; // amount in INR (e.g., 1000)

  if (!amount || !orderId) {
    throw new functions.https.HttpsError("invalid-argument", "Amount and Order ID are required.");
  }

  try {
    // A. Create Order on Razorpay
    const options = {
      amount: amount * 100, // Convert to paise (Razorpay expects paise)
      currency: "INR",
      receipt: orderId,     // Your internal Firestore Order ID
      payment_capture: 1,   // Auto-capture payment
    };

    const order = await razorpay.orders.create(options);

    // B. Calculate Splits (Your Commission Logic)
    // Formula: 2% Buyer Fee + 2% Seller Fee + 0.75% Safety = 4.75%
    const totalAmount = amount;
    const platformFee = totalAmount * 0.0475; 
    const sellerPayout = totalAmount - (totalAmount * 0.0275); // Deducting Seller-side fees only for payout calculation

    // C. Update Firestore with Razorpay Order ID & Financial Breakdown
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

    // Return Order ID to App so it can open Checkout
    return {
      id: order.id,
      currency: order.currency,
      amount: order.amount,
      key: "YOUR_RAZORPAY_KEY_ID" // Helpful to send this back to client
    };

  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * 2. VERIFY PAYMENT
 * Call this from the App immediately after payment success
 */
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { orderId, paymentId, signature, razorpayOrderId } = data;

  // A. Verify Signature (Critical Security Step)
  // This ensures the payment actually happened and wasn't faked by the frontend.
  const body = razorpayOrderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", "YOUR_RAZORPAY_KEY_SECRET") // MUST match your secret
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== signature) {
    throw new functions.https.HttpsError("permission-denied", "Invalid payment signature.");
  }

  try {
    // B. Signature Valid -> Mark Order as PAID in Firestore
    await admin.firestore().collection("orders").doc(orderId).update({
      status: "PENDING_SELLER", // Move to next stage flow
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