const functions = require("firebase-functions");
const axios = require("axios");

// Load DBS environment variables
const DBS_SESSION_URL = process.env.DBS_SESSION_URL;
const DBS_ORDER_STATUS_URL = process.env.DBS_ORDER_STATUS_URL;
const DBS_MERCHANT_ID = process.env.DBS_MERCHANT_ID;
const DBS_CLIENT_ID = process.env.DBS_CLIENT_ID;
const DBS_API_KEY = process.env.DBS_API_KEY;
const DBS_RETURN_URL = process.env.DBS_RETURN_URL;

/**
 * Helper: Creates Basic Auth header as per DBS Section 2
 * "Basic " + Base64(API Key + ":")
 */
const getDBSAuthHeader = () => {
  const encoded = Buffer.from(`${DBS_API_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
};

/**
 * 1. Create DBS Session API (Section 4.1)
 * Called from your backend to create an order and get sdk_payload.
 */
exports.createDBSSession = functions.https.onCall(async (data, context) => {
  const sessionPayload = {
    order_id: data.orderId, // Max 21 chars, alphanumeric
    amount: data.amount.toString(), // Stringified number, up to 2 decimals
    customer_id: data.customerId, // Max 128 chars
    customer_email: data.customerEmail,
    customer_phone: data.customerPhone, // 10-digit, no country code
    payment_page_client_id: DBS_CLIENT_ID,
    action: "paymentPage",
    return_url: DBS_RETURN_URL,
    description: data.description || "ProchemAPP Order",
    first_name: data.firstName || "",
    last_name: data.lastName || "",
    currency: "INR" // Optional, defaults to INR
  };

  try {
    // Note: Content-Type is application/json for Session API
    const response = await axios.post(DBS_SESSION_URL, sessionPayload, {
      headers: {
        'Authorization': getDBSAuthHeader(),
        'x-merchantid': DBS_MERCHANT_ID,
        'Content-Type': 'application/json',
        'x-routing-id': data.customerId, // Recommended: customer_id
      },
    });
    
    // Returns { status: "NEW", id: "...", sdk_payload: {...}, payment_links: {...} }
    return response.data; 
  } catch (error) {
    console.error("DBS Session API Error:", error.response ? error.response.data : error.message);
    // Handle specific DBS errors (Section 4.5)
    if (error.response && error.response.status === 400) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid parameters in order payload.');
    }
    throw new functions.https.HttpsError('internal', 'Unable to create DBS payment session.');
  }
});

/**
 * 2. Verify DBS Order Status API (Section 4.2)
 * This MUST be called S2S after process_result to confirm the final state.
 */
exports.getDBSOrderStatus = functions.https.onCall(async (data, context) => {
  const { orderId } = data;
  const orderStatusUrl = `${DBS_ORDER_STATUS_URL}${orderId}`;

  try {
    // Note: Content-Type is application/x-www-form-urlencoded for Order Status
    const response = await axios.get(orderStatusUrl, {
      headers: {
        'Authorization': getDBSAuthHeader(),
        'x-merchantid': DBS_MERCHANT_ID,
        'Content-Type': 'application/x-www-form-urlencoded',
        'version': '2023-06-30', // Pin the API version as per doc
        'x-routing-id': data.customerId || orderId, // Use same routing ID as session
      },
    });

    const orderData = response.data;
    
    // CRITICAL: Always validate both order ID and actual amount before fulfilling (Section 3.2)
    if (orderData.order_id !== orderId) {
        throw new Error("Order ID mismatch!");
    }

    // Return status_id: 21 (CHARGED) is success
    return orderData;

  } catch (error) {
    console.error("DBS Order Status Error:", error.response ? error.response.data : error.message);
    throw new functions.https.HttpsError('internal', 'Unable to fetch DBS order status.');
  }
});

/**
 * 3. Handle DBS Webhooks (Section 3.2 & 4.2)
 * Juspay sends webhooks to this endpoint. You must verify and then trigger Order Status.
 */
exports.dbsWebhook = functions.https.onRequest(async (req, res) => {
  // 1. Verify Basic Auth (DBS sends webhooks with basic auth)
  const authHeader = req.headers.authorization;
  const expectedAuth = 'Basic ' + Buffer.from(`${process.env.DBS_WEBHOOK_USERNAME}:${process.env.DBS_WEBHOOK_PASSWORD}`).toString('base64');
  
  if (authHeader !== expectedAuth) {
    console.warn("Unauthorized DBS Webhook Attempt");
    return res.status(401).send('Unauthorized');
  }

  // 2. Process the event
  const event = req.body;
  console.log("Received DBS Webhook Event:", event.event_name || event.status);

  // 3. On success event, DO NOT FULFILL DIRECTLY. 
  // Instead, trigger your S2S Order Status API logic to verify.
  if (event.event_name === 'order_succeeded' || event.status === 'CHARGED') {
      // Call getDBSOrderStatus(orderId) internally or via a queue to verify.
      // Then update Firestore.
      console.log(`Webhook received for order ${event.order_id}. Proceed to verify via Order Status API.`);
  }
  
  // Always return 200 quickly to acknowledge receipt
  res.status(200).send('Webhook received');
});