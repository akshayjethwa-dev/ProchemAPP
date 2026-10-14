// File: functions/dbs.js
const functions = require("firebase-functions");
const axios = require("axios");
const crypto = require("crypto");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

// ─────────────────────────────────────────────────────────────
// Environment variables
// ─────────────────────────────────────────────────────────────
const JUSPAY_BASE_URL = process.env.JUSPAY_BASE_URL;
const JUSPAY_MERCHANT_ID = process.env.JUSPAY_MERCHANT_ID;
const JUSPAY_CLIENT_ID = process.env.JUSPAY_CLIENT_ID;
const JUSPAY_API_KEY = process.env.JUSPAY_API_KEY;
const JUSPAY_RETURN_URL = process.env.JUSPAY_RETURN_URL;
const JUSPAY_RESPONSE_KEY = process.env.JUSPAY_RESPONSE_KEY;
const APP_RETURN_URL = process.env.APP_RETURN_URL;

const JUSPAY_SESSION_URL = `${JUSPAY_BASE_URL}/session`;
const JUSPAY_ORDER_STATUS_URL = `${JUSPAY_BASE_URL}/orders/`;
const JUSPAY_CANCEL_URL = `${JUSPAY_BASE_URL}/merchants/${JUSPAY_MERCHANT_ID}/order`;
const JUSPAY_REFUND_URL = `${JUSPAY_BASE_URL}/orders`;

const getJuspayAuthHeader = () => {
  const encoded = Buffer.from(`${JUSPAY_API_KEY}:`).toString("base64");
  return `Basic ${encoded}`;
};

// ─────────────────────────────────────────────────────────────
// Session API Error Code Reference
//   https://docs.dbs.bank.in/  (Section 4.5)
// ─────────────────────────────────────────────────────────────
const SESSION_ERROR_INFO = {
  // ─── 400 invalid_input ───
  MISSING_PARAMETER: {
    message: "A required field is missing from the payment request.",
    retryable: false,
    userAction: "fix_request",
  },
  DUPLICATE_ORDER_ID: {
    message: "This order was already submitted. Please start a new order.",
    retryable: false,
    userAction: "new_order_id",
  },
  // ─── 401 ───
  UNAUTHORIZED: {
    message: "Payment gateway authentication failed. Contact support.",
    retryable: false,
    userAction: "contact_support",
  },
  // ─── 403 ───
  BAD_ORIGIN: {
    message: "Server is not authorised to reach the payment gateway.",
    retryable: false,
    userAction: "contact_support",
  },
  // ─── 404 ───
  RESOURCE_NOT_FOUND: {
    message: "Merchant configuration is invalid. Contact support.",
    retryable: false,
    userAction: "contact_support",
  },
  // ─── 415 ───
  UNSUPPORTED_MEDIA_TYPE: {
    message: "Internal configuration error. Contact support.",
    retryable: false,
    userAction: "contact_support",
  },
  // ─── 422 ───
  INVALID_FORMAT: {
    message: "Invalid field format in payment request.",
    retryable: false,
    userAction: "fix_request",
  },
  // ─── 500 ───
  INTERNAL_SERVER_ERROR: {
    message: "Payment gateway is temporarily unavailable. Please retry.",
    retryable: true,
    userAction: "retry",
  },
  // ─── 502 ───
  GATEWAY_ERROR: {
    message: "Payment gateway had a temporary issue. Please retry.",
    retryable: true,
    userAction: "retry",
  },
  // ─── 504 ───
  GATEWAY_TIMEOUT: {
    message: "Payment gateway timed out. Please retry.",
    retryable: true,
    userAction: "retry",
  },
};

// ─────────────────────────────────────────────────────────────
// Retry helper (exponential backoff) — only for 5xx
// ─────────────────────────────────────────────────────────────
const RETRYABLE_STATUSES = [500, 502, 504];
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

async function retryWithBackoff(fn, label = "DBS") {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const isRetryable = RETRYABLE_STATUSES.includes(status);

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw error;
      }

      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(
        `[${label}] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms (HTTP ${status})`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ─────────────────────────────────────────────────────────────
// Parse a DBS error response into a structured object
// ─────────────────────────────────────────────────────────────
function parseDbsError(error) {
  const resp = error.response;
  if (!resp) {
    return {
      httpStatus: null,
      errorCode: "NETWORK_ERROR",
      subCode: null,
      message: error.message || "Network error reaching payment gateway.",
      retryable: true,
      userAction: "retry",
      raw: null,
    };
  }

  const body = resp.data || {};
  // DBS may nest error details in different shapes
  const errorCode = body.error_code || body.errorCode || body.code || null;
  const subCode =
    body.sub_code ||
    body.subCode ||
    body.details?.sub_code ||
    body.details?.error_code ||
    null;
  const dbsMessage =
    body.message || body.error || body.error_description || body.description || null;

  // Determine which error descriptor to use
  const key = subCode || errorCode;
  const info = SESSION_ERROR_INFO[key] || {
    message: dbsMessage || "Payment gateway returned an unexpected error.",
    retryable: RETRYABLE_STATUSES.includes(resp.status),
    userAction: RETRYABLE_STATUSES.includes(resp.status) ? "retry" : "contact_support",
  };

  return {
    httpStatus: resp.status,
    errorCode: errorCode || `HTTP_${resp.status}`,
    subCode: subCode,
    message: dbsMessage || info.message,
    retryable: info.retryable,
    userAction: info.userAction,
    raw: body,
  };
}

// ─────────────────────────────────────────────────────────────
// 1. Create DBS Session
// ─────────────────────────────────────────────────────────────
exports.createDBSSession = functions.https.onCall(async (data, context) => {
  if (!data || !data.orderId || !data.amount) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "orderId and amount are required.",
      { errorCode: "invalid_input", subCode: "MISSING_PARAMETER", retryable: false, userAction: "fix_request" }
    );
  }

  const orderIdStr = String(data.orderId);
  if (orderIdStr.length > 21 || !/^[a-zA-Z0-9]+$/.test(orderIdStr)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "order_id must be alphanumeric and max 21 characters.",
      { errorCode: "validation_failed", subCode: "INVALID_FORMAT", retryable: false, userAction: "fix_request" }
    );
  }

  const amountNum = Number(data.amount);
  if (isNaN(amountNum) || amountNum < 1) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Minimum amount is INR 1.",
      { errorCode: "validation_failed", subCode: "INVALID_FORMAT", retryable: false, userAction: "fix_request" }
    );
  }
  const amountStr = amountNum.toFixed(2);

  if (!JUSPAY_RETURN_URL || !JUSPAY_RETURN_URL.startsWith("https://") || JUSPAY_RETURN_URL.includes("?")) {
    throw new functions.https.HttpsError(
      "internal",
      "JUSPAY_RETURN_URL must be a valid HTTPS URL with no query parameters.",
      { errorCode: "internal_error", subCode: "INTERNAL_SERVER_ERROR", retryable: false, userAction: "contact_support" }
    );
  }

  const sessionPayload = {
    order_id: orderIdStr,
    amount: amountStr,
    customer_id: String(data.customerId || ""),
    payment_page_client_id: JUSPAY_CLIENT_ID,
    action: data.action || "paymentPage",
    return_url: JUSPAY_RETURN_URL,
    customer_email: data.customerEmail || undefined,
    customer_phone: String(data.customerPhone || "") || undefined,
    mobile_country_code: data.mobileCountryCode || undefined,
    description: data.description || "ProchemAPP Order",
    first_name: data.firstName || undefined,
    last_name: data.lastName || undefined,
    currency: data.currency || "INR",
    order_type: data.orderType || undefined,
    language: data.language || undefined,
    order_fullfillment_threshold_in_mins: data.orderFulfillmentThresholdInMins || undefined,
    udf1: data.udf1, udf2: data.udf2, udf3: data.udf3, udf4: data.udf4, udf5: data.udf5,
    udf6: data.udf6, udf7: data.udf7, udf8: data.udf8, udf9: data.udf9, udf10: data.udf10,
    options: data.options,
    metadata: data.metadata,
  };

  Object.keys(sessionPayload).forEach((key) => {
    if (sessionPayload[key] === undefined) delete sessionPayload[key];
  });

  try {
    const response = await retryWithBackoff(
      () =>
        axios.post(JUSPAY_SESSION_URL, sessionPayload, {
          headers: {
            Authorization: getJuspayAuthHeader(),
            "x-merchantid": JUSPAY_MERCHANT_ID,
            "Content-Type": "application/json",
            "x-routing-id": sessionPayload.customer_id || sessionPayload.order_id,
          },
          timeout: 20000,
        }),
      "DBS-Session"
    );

    const payload = response.data || {};
    console.log("[DBS] Session created:", {
      order_id: payload.order_id,
      status: payload.status,
      hasSdkPayload: !!payload.sdk_payload,
      hasWebLink: !!payload.payment_links?.web,
    });

    // Persist trusted amount for later Order Status validation
    try {
      await admin.firestore().collection("orders").doc(orderIdStr).set(
        {
          orderId: orderIdStr,
          customerId: sessionPayload.customer_id,
          amount: amountNum,
          currency: sessionPayload.currency,
          status: "SESSION_CREATED",
          dbsOrderId: payload.id || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn("[DBS] Firestore write for order failed:", fsErr.message);
    }

    return payload;
  } catch (error) {
    const parsed = parseDbsError(error);

    console.error("[DBS] Session API Error:", {
      httpStatus: parsed.httpStatus,
      error_code: parsed.errorCode,
      sub_code: parsed.subCode,
      message: parsed.message,
      retryable: parsed.retryable,
    });

    // Map to Firebase HttpsError code so client can branch on it
    let httpsCode = "internal";
    if (parsed.httpStatus === 400) httpsCode = "invalid-argument";
    else if (parsed.httpStatus === 401) httpsCode = "unauthenticated";
    else if (parsed.httpStatus === 403) httpsCode = "permission-denied";
    else if (parsed.httpStatus === 404) httpsCode = "not-found";
    else if (parsed.httpStatus === 415) httpsCode = "invalid-argument";
    else if (parsed.httpStatus === 422) httpsCode = "invalid-argument";

    throw new functions.https.HttpsError(httpsCode, parsed.message, {
      errorCode: parsed.errorCode,
      subCode: parsed.subCode,
      retryable: parsed.retryable,
      userAction: parsed.userAction,
      httpStatus: parsed.httpStatus,
      raw: parsed.raw,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. Order Status API (unchanged)
// ─────────────────────────────────────────────────────────────
exports.getDBSOrderStatus = functions.https.onCall(async (data, context) => {
  const {
    orderId,
    expectedAmount: clientExpectedAmount,
    customerId,
    includeFullGatewayResponse = false,
  } = data || {};

  if (!orderId) {
    throw new functions.https.HttpsError("invalid-argument", "orderId is required.");
  }

  let expectedAmount = null;
  try {
    const orderDoc = await admin.firestore().collection("orders").doc(orderId).get();
    if (orderDoc.exists) {
      expectedAmount = orderDoc.data().amount ?? null;
    }
  } catch (fsErr) {
    console.warn("[DBS] Firestore read failed:", fsErr.message);
  }

  if (expectedAmount === null && typeof clientExpectedAmount === "number") {
    expectedAmount = clientExpectedAmount;
  }

  let orderStatusUrl = `${JUSPAY_ORDER_STATUS_URL}${encodeURIComponent(orderId)}`;
  if (includeFullGatewayResponse) {
    orderStatusUrl += "?options.add_full_gateway_response=true";
  }

  try {
    const response = await retryWithBackoff(
      () =>
        axios.get(orderStatusUrl, {
          headers: {
            Authorization: getJuspayAuthHeader(),
            "x-merchantid": JUSPAY_MERCHANT_ID,
            "Content-Type": "application/x-www-form-urlencoded",
            version: "2023-06-30",
            "x-routing-id": customerId || orderId,
          },
          timeout: 20000,
        }),
      "DBS-Status"
    );

    const orderData = response.data || {};

    if (orderData.order_id && orderData.order_id !== orderId) {
      throw new functions.https.HttpsError("internal", "Order ID mismatch.");
    }

    const chargedAmount = parseFloat(String(orderData.effective_amount ?? orderData.amount ?? "0"));
    if (expectedAmount !== null && expectedAmount !== undefined) {
      if (isNaN(chargedAmount)) {
        throw new functions.https.HttpsError("internal", "Unable to parse amount.");
      }
      const diff = Math.abs(chargedAmount - expectedAmount);
      if (diff > 1.0) {
        console.error("[DBS] Amount mismatch!", { orderId, expectedAmount, chargedAmount, diff });
        throw new functions.https.HttpsError("internal", `Amount mismatch: expected ${expectedAmount}, got ${chargedAmount}.`);
      }
    }

    const statusId = orderData.status_id;
    let action = "unknown";
    let message = "";
    switch (statusId) {
      case 21: action = "fulfil"; message = "Payment successful."; break;
      case 26: case 27: action = "decline"; message = "Payment failed."; break;
      case 23: case 28: action = "pending"; message = "Payment pending."; break;
      case 22: case 24: action = "cancelled"; message = "Order cancelled/expired."; break;
      default: action = "unknown"; message = "Unknown status.";
    }

    const enriched = {
      raw: orderData,
      order_id: orderData.order_id,
      dbs_order_id: orderData.id,
      status: orderData.status,
      status_id: orderData.status_id,
      action,
      message,
      amount: orderData.amount,
      effective_amount: orderData.effective_amount ?? orderData.amount,
      currency: orderData.currency || "INR",
      txn_id: orderData.txn_id,
      txn_uuid: orderData.txn_uuid,
      txn_detail: orderData.txn_detail || null,
      payment_gateway_response: orderData.payment_gateway_response || null,
      payment_method_type: orderData.payment_method_type,
      payment_method: orderData.payment_method,
      card: orderData.card || null,
      upi: orderData.upi || null,
      mandate: orderData.mandate || null,
      offers: orderData.offers || [],
      refunds: orderData.refunds || [],
      refunded: orderData.refunded || false,
      amount_refunded: orderData.amount_refunded || 0,
      txn_list: orderData.txn_list || null,
    };

    try {
      await admin.firestore().collection("orders").doc(orderId).set(
        {
          paymentStatus: enriched.status,
          statusId: enriched.status_id,
          effectiveAmount: enriched.effective_amount,
          txnId: enriched.txn_id,
          paymentMethodType: enriched.payment_method_type,
          refunded: enriched.refunded,
          amountRefunded: enriched.amount_refunded,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn("[DBS] Firestore update failed:", fsErr.message);
    }

    return enriched;
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    const parsed = parseDbsError(error);
    console.error("[DBS] Order Status Error:", parsed);
    throw new functions.https.HttpsError("internal", parsed.message, {
      errorCode: parsed.errorCode,
      subCode: parsed.subCode,
      retryable: parsed.retryable,
      userAction: parsed.userAction,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. Cancel Order (with retry for 5xx)
// ─────────────────────────────────────────────────────────────
exports.cancelDBSOrder = functions.https.onCall(async (data, context) => {
  const { orderId, cancelReason = "User Cancelled" } = data || {};

  if (!orderId) {
    throw new functions.https.HttpsError("invalid-argument", "orderId is required.");
  }
  if (!cancelReason || typeof cancelReason !== "string" || cancelReason.length > 255) {
    throw new functions.https.HttpsError("invalid-argument", "cancelReason must be a string of max 255 chars.");
  }

  const cancelUrl = `${JUSPAY_CANCEL_URL}/${encodeURIComponent(orderId)}/cancel`;

  try {
    const response = await retryWithBackoff(
      () =>
        axios.post(
          cancelUrl,
          { cancel_reason: cancelReason },
          {
            headers: {
              Authorization: getJuspayAuthHeader(),
              "x-merchantid": JUSPAY_MERCHANT_ID,
              "Content-Type": "application/json",
            },
            timeout: 20000,
          }
        ),
      "DBS-Cancel"
    );

    const payload = response.data || {};
    const isSuccess = payload.status === "Success";

    try {
      await admin.firestore().collection("orders").doc(orderId).set(
        {
          cancelled: isSuccess,
          cancelReason,
          cancelledAt: isSuccess ? admin.firestore.FieldValue.serverTimestamp() : null,
          cancelResponse: payload,
          status: isSuccess ? "CANCELLED" : undefined,
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn("[DBS] Firestore cancel update failed:", fsErr.message);
    }

    return {
      success: isSuccess,
      status: payload.status,
      message: payload.message,
      order_id: payload.order_id || orderId,
    };
  } catch (error) {
    const resp = error.response;
    if (resp && [400, 404, 409].includes(resp.status)) {
      const errData = resp.data || {};
      try {
        await admin.firestore().collection("orders").doc(orderId).set(
          {
            cancelAttempted: true,
            cancelAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelError: errData,
          },
          { merge: true }
        );
      } catch (_) {}
      return {
        success: false,
        status: "NotCancellable",
        message: errData.message || "Order is not in ACTIVE state.",
        order_id: orderId,
      };
    }
    const parsed = parseDbsError(error);
    console.error("[DBS] Cancel Error:", parsed);
    throw new functions.https.HttpsError("internal", parsed.message, {
      errorCode: parsed.errorCode,
      subCode: parsed.subCode,
      retryable: parsed.retryable,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. Return URL Handler (unchanged)
// ─────────────────────────────────────────────────────────────
exports.handleReturnURL = functions.https.onRequest(async (req, res) => {
  const params = req.query;
  const isValid = verifyReturnURLSignature(params);
  if (!isValid) {
    console.warn("[DBS] Invalid return URL signature");
    return res.status(400).send("Invalid signature");
  }

  const { order_id } = params;
  try {
    const verified = await exports.getDBSOrderStatus({ orderId: order_id, includeFullGatewayResponse: false });
    res.redirect(`${APP_RETURN_URL}?order_id=${order_id}&status=${verified.status}`);
  } catch (err) {
    console.error("[DBS] Return URL verification failed:", err);
    res.redirect(`${APP_RETURN_URL}?order_id=${order_id}&status=PENDING`);
  }
});

// ─────────────────────────────────────────────────────────────
// 5. Webhook Handler (unchanged)
// ─────────────────────────────────────────────────────────────
exports.dbsWebhook = functions.https.onRequest(async (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedAuth = "Basic " + Buffer.from(
    `${process.env.JUSPAY_WEBHOOK_USERNAME}:${process.env.JUSPAY_WEBHOOK_PASSWORD}`
  ).toString("base64");

  if (authHeader !== expectedAuth) {
    return res.status(401).send("Unauthorized");
  }

  const event = req.body || {};
  console.log("[DBS] Webhook:", { event_name: event.event_name, order_id: event.order_id, status: event.status });

  if (event.event_name === "ORDER_SUCCEEDED" || event.status === "CHARGED" || event.event_name === "order_succeeded") {
    try {
      const verified = await exports.getDBSOrderStatus({ orderId: event.order_id, includeFullGatewayResponse: true });
      if (verified.status === "CHARGED" && verified.action === "fulfil") {
        await admin.firestore().collection("orders").doc(event.order_id).set(
          {
            paymentStatus: "CHARGED",
            statusId: 21,
            fulfilledAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.error("[DBS] Webhook S2S failed:", err);
    }
  }

  if (
    event.event_name === "REFUND_SUCCEEDED" ||
    event.event_name === "REFUND_FAILED" ||
    event.event_name === "refund_succeeded" ||
    event.event_name === "refund_failed"
  ) {
    const refundId = event.unique_request_id;
    const orderId = event.order_id;
    const isSuccess = /succeeded/i.test(event.event_name);
    try {
      await admin.firestore()
        .collection("orders").doc(orderId)
        .collection("refunds").doc(refundId)
        .set(
          {
            status: isSuccess ? "SUCCEEDED" : "FAILED",
            webhookPayload: event,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    } catch (err) {
      console.error("[DBS] Refund webhook update failed:", err);
    }
  }

  res.status(200).send("Webhook received");
});

// ─────────────────────────────────────────────────────────────
// 6. Refund Order (with retry for 5xx)
// ─────────────────────────────────────────────────────────────
exports.createRefund = functions.https.onCall(async (data, context) => {
  const { orderId, amount, reason, metadata, customerId } = data || {};

  if (!orderId) {
    throw new functions.https.HttpsError("invalid-argument", "orderId is required.");
  }

  let amountNum = null;
  if (amount !== undefined && amount !== null) {
    amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      throw new functions.https.HttpsError("invalid-argument", "Refund amount must be at least INR 1.");
    }
  }

  let metaDataString;
  if (metadata && typeof metadata === "object") {
    metaDataString = JSON.stringify(metadata);
  } else if (reason) {
    metaDataString = JSON.stringify({ description: reason });
  }

  const uniqueRequestId = generateRefundRequestId();

  const formBody = new URLSearchParams();
  formBody.append("unique_request_id", uniqueRequestId);
  if (amountNum !== null) formBody.append("amount", amountNum.toFixed(2));
  if (metaDataString) formBody.append("metaData", metaDataString);

  const refundUrl = `${JUSPAY_REFUND_URL}/${encodeURIComponent(orderId)}/refunds`;

  try {
    const response = await retryWithBackoff(
      () =>
        axios.post(refundUrl, formBody.toString(), {
          headers: {
            Authorization: getJuspayAuthHeader(),
            "x-merchantid": JUSPAY_MERCHANT_ID,
            "Content-Type": "application/x-www-form-urlencoded",
            version: "2023-06-30",
            "x-routing-id": customerId || orderId,
          },
          timeout: 20000,
        }),
      "DBS-Refund"
    );

    const payload = response.data || {};
    const refund = payload.refunds?.[0] || {};

    try {
      await admin.firestore()
        .collection("orders").doc(orderId)
        .collection("refunds").doc(uniqueRequestId)
        .set(
          {
            uniqueRequestId,
            orderId,
            amount: amountNum ?? refund.amount ?? null,
            metaData: metaDataString ? JSON.parse(metaDataString) : null,
            status: refund.status || "PENDING",
            sentToGateway: payload.sent_to_gateway ?? false,
            response: payload,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    } catch (fsErr) {
      console.warn("[DBS] Firestore refund write failed:", fsErr.message);
    }

    return {
      success: true,
      unique_request_id: uniqueRequestId,
      order_id: orderId,
      amount: refund.amount ?? amountNum ?? null,
      currency: payload.currency || "INR",
      status: refund.status || "PENDING",
      sent_to_gateway: payload.sent_to_gateway ?? false,
      refunded: payload.refunded ?? false,
      amount_refunded: payload.amount_refunded ?? 0,
      maximum_eligible_refund_amount: payload.maximum_eligible_refund_amount ?? null,
      refunds: payload.refunds || [],
      raw: payload,
    };
  } catch (error) {
    const parsed = parseDbsError(error);
    if (parsed.errorCode) {
      try {
        await admin.firestore()
          .collection("orders").doc(orderId)
          .collection("refunds").doc(uniqueRequestId)
          .set(
            {
              uniqueRequestId,
              orderId,
              amount: amountNum,
              status: "FAILED",
              errorCode: parsed.errorCode,
              errorMessage: parsed.message,
              errorResponse: parsed.raw,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      } catch (_) {}

      return {
        success: false,
        unique_request_id: uniqueRequestId,
        order_id: orderId,
        error_code: parsed.errorCode,
        message: parsed.message,
        raw: parsed.raw,
      };
    }

    throw new functions.https.HttpsError("internal", parsed.message);
  }
});

// ─────────────────────────────────────────────────────────────
// 7. Get Refunds for Order (unchanged)
// ─────────────────────────────────────────────────────────────
exports.getRefundsForOrder = functions.https.onCall(async (data, context) => {
  const { orderId } = data || {};
  if (!orderId) throw new functions.https.HttpsError("invalid-argument", "orderId is required.");

  try {
    const snap = await admin.firestore()
      .collection("orders").doc(orderId)
      .collection("refunds")
      .orderBy("createdAt", "desc")
      .get();
    const refunds = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { success: true, order_id: orderId, refunds };
  } catch (err) {
    throw new functions.https.HttpsError("internal", "Unable to fetch refund history.");
  }
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function generateRefundRequestId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const id = `RF${ts}${rand}`;
  return id.length > 20 ? id.slice(0, 20) : id;
}

function verifyReturnURLSignature(params) {
  const { signature, signature_algorithm, ...rest } = params;
  if (!signature || !signature_algorithm) return false;

  const sortedKeys = Object.keys(rest).sort();
  const encodedPairs = sortedKeys.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(rest[key])}`);
  const encodedString = encodeURIComponent(encodedPairs.join("&"));

  const computedHash = crypto.createHmac("sha256", JUSPAY_RESPONSE_KEY).update(encodedString).digest("base64");
  const decodedSignature = decodeURIComponent(signature);
  return computedHash === decodedSignature;
}