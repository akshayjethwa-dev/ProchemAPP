// File: src/services/payment.ts
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { HYPER_SDK_CONFIG, isJuspayConfigured } from "../config";
import { openHyperCheckout } from "./hyperSdk";

// ─────────────────────────────────────────────────────────────
// Typed error — thrown by all Juspay wrappers
// ─────────────────────────────────────────────────────────────
export type JuspayUserAction =
  | "retry"            // transient — user can tap Retry
  | "new_order_id"     // DUPLICATE_ORDER_ID — must regenerate order ID
  | "fix_request"      // dev-time error (missing param, bad format)
  | "contact_support"  // config / auth / origin errors
  | "unknown";

export class JuspayApiError extends Error {
  errorCode: string;
  subCode: string | null;
  retryable: boolean;
  userAction: JuspayUserAction;
  httpStatus: number | null;
  raw: any;

  constructor(message: string, opts: {
    errorCode?: string;
    subCode?: string | null;
    retryable?: boolean;
    userAction?: JuspayUserAction;
    httpStatus?: number | null;
    raw?: any;
  } = {}) {
    super(message);
    this.name = "JuspayApiError";
    this.errorCode = opts.errorCode || "UNKNOWN";
    this.subCode = opts.subCode ?? null;
    this.retryable = opts.retryable ?? false;
    this.userAction = opts.userAction ?? "unknown";
    this.httpStatus = opts.httpStatus ?? null;
    this.raw = opts.raw ?? null;
  }
}

// Translate Firebase FunctionsError → JuspayApiError
function translateFirebaseError(err: any): JuspayApiError {
  // Firebase HttpsError has `code` (e.g. "functions/invalid-argument") and `details`
  const details = err?.details || {};
  const fbCode: string = err?.code || "";

  const message = err?.message || details.message || "Payment gateway error.";

  // Prefer structured details from the Cloud Function
  if (details.errorCode || details.subCode || details.userAction) {
    return new JuspayApiError(message, {
      errorCode: details.errorCode,
      subCode: details.subCode,
      retryable: details.retryable,
      userAction: details.userAction,
      httpStatus: details.httpStatus,
      raw: details.raw,
    });
  }

  // Fallback heuristic based on Firebase error code
  if (fbCode.includes("unavailable") || fbCode.includes("deadline-exceeded")) {
    return new JuspayApiError(message, {
      errorCode: "INTERNAL_SERVER_ERROR",
      retryable: true,
      userAction: "retry",
    });
  }
  if (fbCode.includes("invalid-argument")) {
    return new JuspayApiError(message, {
      errorCode: "invalid_input",
      retryable: false,
      userAction: "fix_request",
    });
  }
  if (fbCode.includes("unauthenticated")) {
    return new JuspayApiError(message, {
      errorCode: "UNAUTHORIZED",
      retryable: false,
      userAction: "contact_support",
    });
  }

  return new JuspayApiError(message, {
    errorCode: "UNKNOWN",
    retryable: false,
    userAction: "unknown",
  });
}

export function validateJuspayProductionConfig(): void {
  if (!isJuspayConfigured()) {
    throw new Error(
      "Juspay production configuration is incomplete. Set EXPO_PUBLIC_JUSPAY_MERCHANT_ID and EXPO_PUBLIC_JUSPAY_CLIENT_ID."
    );
  }
  if (HYPER_SDK_CONFIG.environment !== "production") {
    console.warn("[Juspay] Not in production mode.");
  }
}

// ─────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────
export type JuspayOrderAction = "fulfil" | "decline" | "pending" | "cancelled" | "unknown";

export interface JuspayOrderStatus {
  order_id?: string;
  dbs_order_id?: string;
  status?: string;
  status_id?: number;
  action?: JuspayOrderAction;
  message?: string;
  amount?: number | string;
  effective_amount?: number | string;
  currency?: string;
  txn_id?: string;
  txn_uuid?: string;
  txn_detail?: any;
  payment_gateway_response?: any;
  payment_method_type?: string;
  payment_method?: string;
  card?: any;
  upi?: any;
  mandate?: any;
  offers?: any[];
  refunds?: any[];
  refunded?: boolean;
  amount_refunded?: number | string;
  txn_list?: any[];
  raw?: any;
  [key: string]: any;
}

export interface JuspayCancelResult {
  success: boolean;
  status: string;
  message: string;
  order_id: string;
}

export interface JuspayRefundResult {
  success: boolean;
  unique_request_id: string;
  order_id: string;
  amount?: number | null;
  currency?: string;
  status?: string;
  sent_to_gateway?: boolean;
  refunded?: boolean;
  amount_refunded?: number;
  maximum_eligible_refund_amount?: number | null;
  refunds?: any[];
  error_code?: string | null;
  message?: string;
  raw?: any;
}

export interface JuspayRefundHistoryResponse {
  success: boolean;
  order_id: string;
  refunds: any[];
}

// ─────────────────────────────────────────────────────────────
// Create Session — throws JuspayApiError on failure
// ─────────────────────────────────────────────────────────────
export async function createJuspayCheckoutSession(params: {
  orderId: string;
  amount: number;
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  firstName?: string;
  lastName?: string;
  currency?: string;
  mobileCountryCode?: string;
  orderType?: string;
  language?: string;
  orderFulfillmentThresholdInMins?: number;
  options?: Record<string, any>;
  metadata?: Record<string, any>;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  udf6?: string;
  udf7?: string;
  udf8?: string;
  udf9?: string;
  udf10?: string;
}) {
  validateJuspayProductionConfig();
  const functionsInstance = getFunctions(getApp(), "asia-south1");
  const createSession = httpsCallable(functionsInstance, "createDBSSession");

  try {
    const response = await createSession(params);
    const payload = response.data as any;
    const sdkPayload = payload?.sdk_payload;
    if (!sdkPayload) {
      throw new JuspayApiError("Server did not return sdk_payload.", {
        errorCode: "INTERNAL_SERVER_ERROR",
        retryable: true,
        userAction: "retry",
      });
    }
    openHyperCheckout(sdkPayload, params.orderId, params.amount, params.customerId);
    return payload;
  } catch (err: any) {
    // Already a typed error — rethrow
    if (err instanceof JuspayApiError) throw err;
    // Translate Firebase error
    throw translateFirebaseError(err);
  }
}

// ─────────────────────────────────────────────────────────────
// Get Order Status
// ─────────────────────────────────────────────────────────────
export async function getJuspayCheckoutStatus(
  orderId: string,
  expectedAmount?: number,
  customerId?: string,
  includeFullGatewayResponse: boolean = false
): Promise<JuspayOrderStatus> {
  if (!orderId) throw new Error("orderId is required.");
  const functionsInstance = getFunctions(getApp(), "asia-south1");
  const getStatus = httpsCallable(functionsInstance, "getDBSOrderStatus");
  try {
    const response = await getStatus({
      orderId,
      expectedAmount,
      customerId,
      includeFullGatewayResponse,
    });
    return (response.data || {}) as JuspayOrderStatus;
  } catch (err: any) {
    throw translateFirebaseError(err);
  }
}

// ─────────────────────────────────────────────────────────────
// Cancel Order
// ─────────────────────────────────────────────────────────────
export async function cancelJuspayOrder(
  orderId: string,
  cancelReason: string = "User Cancelled"
): Promise<JuspayCancelResult> {
  if (!orderId) throw new Error("orderId is required to cancel an order.");
  const functionsInstance = getFunctions(getApp(), "asia-south1");
  const cancelFn = httpsCallable(functionsInstance, "cancelDBSOrder");
  try {
    const response = await cancelFn({ orderId, cancelReason });
    return response.data as JuspayCancelResult;
  } catch (err: any) {
    throw translateFirebaseError(err);
  }
}

// ─────────────────────────────────────────────────────────────
// Refund Order
// ─────────────────────────────────────────────────────────────
export async function initiateJuspayRefund(
  orderId: string,
  amount?: number,
  reason?: string,
  metadata?: Record<string, any>,
  customerId?: string
): Promise<JuspayRefundResult> {
  if (!orderId) throw new Error("orderId is required to initiate a refund.");
  const functionsInstance = getFunctions(getApp(), "asia-south1");
  const refundFn = httpsCallable(functionsInstance, "createRefund");
  try {
    const response = await refundFn({ orderId, amount, reason, metadata, customerId });
    return response.data as JuspayRefundResult;
  } catch (err: any) {
    throw translateFirebaseError(err);
  }
}

// ─────────────────────────────────────────────────────────────
// Refund History
// ─────────────────────────────────────────────────────────────
export async function getJuspayRefunds(orderId: string): Promise<JuspayRefundHistoryResponse> {
  if (!orderId) throw new Error("orderId is required.");
  const functionsInstance = getFunctions(getApp(), "asia-south1");
  const getRefunds = httpsCallable(functionsInstance, "getRefundsForOrder");
  try {
    const response = await getRefunds({ orderId });
    return response.data as JuspayRefundHistoryResponse;
  } catch (err: any) {
    throw translateFirebaseError(err);
  }
}