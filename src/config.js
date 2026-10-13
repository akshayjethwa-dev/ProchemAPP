// src/config.js
// Production-safe Juspay configuration. Values are read from environment variables
// at build/runtime so production credentials are never committed to source control.
const readEnv = (key, fallback = "") => {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }

  if (typeof window !== "undefined" && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }

  return fallback;
};

const merchantId = readEnv("EXPO_PUBLIC_JUSPAY_MERCHANT_ID", "");
const clientId = readEnv("EXPO_PUBLIC_JUSPAY_CLIENT_ID", "");
const environment = readEnv("EXPO_PUBLIC_JUSPAY_ENVIRONMENT", "production");
const apiUrl = readEnv("EXPO_PUBLIC_JUSPAY_API_URL", "https://api.juspay.in/session");

export const HYPER_SDK_CONFIG = {
  merchantId,
  clientId,
  environment,
  apiUrl,
};

export const isJuspayConfigured = () =>
  Boolean(
    merchantId &&
      merchantId !== "YOUR_DBS_PRODUCTION_MERCHANT_ID" &&
      clientId &&
      clientId !== "YOUR_DBS_PRODUCTION_CLIENT_ID"
  );