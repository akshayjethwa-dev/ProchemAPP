// File: src/services/mandates.ts
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type MandateStatus =
  | "CREATED"
  | "ACTIVE"
  | "PAUSED"
  | "REVOKED"
  | "FAILURE"
  | "EXPIRED"
  | string;

export interface MandateConfig {
  maxAmount: number;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  startDate?: number;  // epoch seconds
  endDate?: number;    // epoch seconds
  amountRule?: "VARIABLE" | "FIXED";
  revokableByCustomer?: boolean;
}

export interface MandateDetails {
  mandate_id: string;
  status: MandateStatus;
  frequency?: string;
  end_date?: string;
  start_date?: string;
  max_amount?: string;
  amount_rule?: string;
  mandate_type?: string;
  customer_id?: string;
  currency?: string;
  revokable_by_customer?: boolean;
  block_fund?: boolean;
  payment_info?: any;
  raw?: any;
}

export interface MandateExecutionResult {
  success: boolean;
  mandate_id: string;
  order_id: string;
  status?: string;
  txn_id?: string | null;
  error_code?: string;
  message?: string;
  raw?: any;
}

// ─────────────────────────────────────────────────────────────
// Create a mandate-enabled subscription session
// ─────────────────────────────────────────────────────────────
export async function createMandateSubscriptionSession(params: {
  planKey: string;
  customerDetails: {
    name?: string;
    email?: string;
    phone?: string;
  };
  mandate: MandateConfig;
}) {
  const functionsInstance = getFunctions(getApp(), "asia-south1");
  const createSession = httpsCallable(functionsInstance, "createJuspaySession");

  const response = await createSession({
    type: "subscription_autopay",
    referenceId: params.planKey,
    customerDetails: params.customerDetails,
    mandate: params.mandate,
  });

  return response.data as {
    order_id: string;
    sdk_payload: any;
    payment_url: string | null;
    mandate_requested: boolean;
  };
}

// ─────────────────────────────────────────────────────────────
// Execute a mandate debit (usually called by your backend scheduler)
// ─────────────────────────────────────────────────────────────
export async function executeMandatePayment(params: {
  mandateId: string;
  orderId: string;
  amount: number;
  customerId?: string;
}): Promise<MandateExecutionResult> {
  const functionsInstance = getFunctions(getApp(), "asia-south1");
  const execute = httpsCallable(functionsInstance, "executeMandatePayment");
  const response = await execute(params);
  return response.data as MandateExecutionResult;
}

// ─────────────────────────────────────────────────────────────
// Get mandate status (syncs with PG)
// ─────────────────────────────────────────────────────────────
export async function getMandateStatus(mandateId: string): Promise<MandateDetails> {
  const functionsInstance = getFunctions(getApp(), "asia-south1");
  const getStatus = httpsCallable(functionsInstance, "getMandateStatus");
  const response = await getStatus({ mandateId });
  return response.data as MandateDetails;
}

// ─────────────────────────────────────────────────────────────
// List all mandates for the current customer
// ─────────────────────────────────────────────────────────────
export async function listCustomerMandates(customerId?: string) {
  const functionsInstance = getFunctions(getApp(), "asia-south1");
  const listFn = httpsCallable(functionsInstance, "listCustomerMandates");
  const response = await listFn({ customerId });
  return response.data as { mandates: MandateDetails[] };
}