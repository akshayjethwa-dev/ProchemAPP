import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { HYPER_SDK_CONFIG, isJuspayConfigured } from "../config";

export function validateJuspayProductionConfig() {
  if (!isJuspayConfigured()) {
    throw new Error(
      "Juspay production configuration is incomplete. Set EXPO_PUBLIC_JUSPAY_MERCHANT_ID and EXPO_PUBLIC_JUSPAY_CLIENT_ID."
    );
  }

  if (HYPER_SDK_CONFIG.environment !== "production") {
    console.warn("Juspay config is not in production mode. Check EXPO_PUBLIC_JUSPAY_ENVIRONMENT.");
  }
}

export async function createJuspayCheckoutSession({
  amount,
  type = "product",
  referenceId,
  customerDetails = {},
}) {
  validateJuspayProductionConfig();

  const functionsInstance = getFunctions(getApp(), "asia-south1");
  const createSession = httpsCallable(functionsInstance, "createJuspaySession");

  const response = await createSession({
    amount,
    type,
    referenceId,
    customerDetails,
  });

  return response.data || {};
}

export async function getJuspayCheckoutStatus(orderId) {
  if (!orderId) {
    throw new Error("orderId is required to fetch Juspay payment status.");
  }

  const functionsInstance = getFunctions(getApp(), "asia-south1");
  const getStatus = httpsCallable(functionsInstance, "getJuspayOrderStatus");

  const response = await getStatus({ orderId });
  return response.data || {};
}