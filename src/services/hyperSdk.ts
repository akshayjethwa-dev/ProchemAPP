// File: src/services/hyperSdk.ts
// ─────────────────────────────────────────────────────────────
// Native version — used automatically by Metro when bundling for
// iOS / Android. The web counterpart is hyperSdk.web.ts.
// ─────────────────────────────────────────────────────────────
import { NativeEventEmitter, NativeModules } from "react-native";
import HyperSdkReact from "hyper-sdk-react";
import { HYPER_SDK_CONFIG } from "../config";
import { getJuspayCheckoutStatus } from "./payment";

let _isInitialised = false;
let _hyperEventListener: any = null;
let _pendingOrderId: string | null = null;
let _pendingAmount: number | null = null;
let _pendingCustomerId: string | null = null;
let _pollingInterval: ReturnType<typeof setInterval> | null = null;
let _fulfilmentWindowTimer: ReturnType<typeof setTimeout> | null = null;

function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─────────────────────────────────────────────────────────────
// STAGE 1 – Boot the Hypercheckout SDK
//   Order: preFetch → createHyperServices → initiate
//   Fire-and-forget. Call EXACTLY ONCE per app lifecycle.
// ─────────────────────────────────────────────────────────────
export function initiateHyperSdk(): void {
  if (_isInitialised) {
    console.warn("[HyperSDK] initiate() already called – skipping to avoid JP_017.");
    return;
  }

  try {
    // Step 0: PreFetch — warm up the SDK as early as possible
    const preFetchPayload = {
      service: "in.juspay.hypercheckout",
      payload: {
        clientId: HYPER_SDK_CONFIG.clientId,
      },
    };
    HyperSdkReact.preFetch(JSON.stringify(preFetchPayload));

    // Step 1: Create the native HyperServices instance.
    //         Mandatory — subsequent calls fail without it.
    HyperSdkReact.createHyperServices();

    // Step 2: Initiate
    const initiatePayload = {
      requestId: uuidv4(),
      service: "in.juspay.hypercheckout",
      payload: {
        action: "initiate",
        merchantId: HYPER_SDK_CONFIG.merchantId,
        clientId: HYPER_SDK_CONFIG.clientId,
        environment: HYPER_SDK_CONFIG.environment,
      },
    };
    HyperSdkReact.initiate(JSON.stringify(initiatePayload));

    _isInitialised = true;
    console.log("[HyperSDK] preFetch → createHyperServices → initiate sent.");
  } catch (err: any) {
    console.error("[HyperSDK] initiateHyperSdk failed:", err?.message || err);
  }
}

// ─────────────────────────────────────────────────────────────
// STAGE 2 – Open the Hypercheckout screen
// ─────────────────────────────────────────────────────────────
export function openHyperCheckout(
  sdkPayload: Record<string, any>,
  orderId: string,
  amount?: number,
  customerId?: string
): void {
  if (!sdkPayload) {
    throw new Error("[HyperSDK] sdkPayload is required to open checkout.");
  }

  _pendingOrderId = orderId;
  _pendingAmount = amount ?? null;
  _pendingCustomerId = customerId ?? null;

  const processPayload = {
    requestId: uuidv4(),
    service: "in.juspay.hypercheckout",
    payload: {
      action: "process",
      ...sdkPayload,
    },
  };

  HyperSdkReact.process(JSON.stringify(processPayload));
  console.log("[HyperSDK] process() sent for order:", orderId);
}

// ─────────────────────────────────────────────────────────────
// Register the global HyperEvent listener
// ─────────────────────────────────────────────────────────────
export function registerHyperCallbackHandler(
  onEvent: (event: string, data: any) => void
): void {
  if (_hyperEventListener) {
    _hyperEventListener.remove();
    _hyperEventListener = null;
  }

  const eventEmitter = new NativeEventEmitter(NativeModules.HyperSdkReact);

  _hyperEventListener = eventEmitter.addListener("HyperEvent", (resp: string) => {
    try {
      const data = JSON.parse(resp);
      const event = data.event || "";
      console.log("[HyperSDK] Event:", event, data);

      if (event === "process_result") {
        handleProcessResult(data);
      }

      onEvent(event, data);
    } catch (err) {
      console.warn("[HyperSDK] Failed to parse HyperEvent payload:", resp, err);
    }
  });

  console.log("[HyperSDK] HyperEvent listener registered.");
}

// ─────────────────────────────────────────────────────────────
// Internal: handle process_result → verify via Order Status API
// ─────────────────────────────────────────────────────────────
async function handleProcessResult(data: any): Promise<void> {
  const orderId = data?.order_id || data?.orderId || _pendingOrderId;
  if (!orderId) {
    console.warn("[HyperSDK] process_result missing order_id; cannot verify.");
    return;
  }

  console.log("[HyperSDK] process_result received. Verifying S2S for order:", orderId);

  try {
    const result = (await getJuspayCheckoutStatus(
      orderId,
      _pendingAmount ?? undefined,
      _pendingCustomerId ?? undefined,
      true
    )) as any;

    const { status, status_id, action, effective_amount, txn_id } = result;

    console.log("[HyperSDK] Verified:", {
      orderId,
      status,
      status_id,
      action,
      effective_amount,
      txn_id,
    });

    switch (action) {
      case "fulfil":
        console.log(`[HyperSDK] Order ${orderId} CHARGED. Fulfilment confirmed.`);
        break;
      case "decline":
        console.log(`[HyperSDK] Order ${orderId} FAILED (status_id: ${status_id}).`);
        break;
      case "pending":
        console.log(`[HyperSDK] Order ${orderId} PENDING (${status}). Starting polling...`);
        startPolling(orderId);
        break;
      default:
        console.warn(`[HyperSDK] Unknown status for order ${orderId}:`, status);
    }
  } catch (err) {
    console.error("[HyperSDK] S2S verification failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// Internal: poll Order Status API until fulfilled / declined
// ─────────────────────────────────────────────────────────────
function startPolling(orderId: string): void {
  stopPolling();

  _pollingInterval = setInterval(async () => {
    try {
      const result = (await getJuspayCheckoutStatus(
        orderId,
        _pendingAmount ?? undefined,
        _pendingCustomerId ?? undefined,
        true
      )) as any;

      const { action } = result;

      if (action === "fulfil") {
        console.log(`[HyperSDK] Order ${orderId} now CHARGED.`);
        stopPolling();
      } else if (action === "decline") {
        console.log(`[HyperSDK] Order ${orderId} now FAILED.`);
        stopPolling();
      }
    } catch (err) {
      console.error("[HyperSDK] Polling error:", err);
    }
  }, 10000);

  _fulfilmentWindowTimer = setTimeout(() => {
    console.log(`[HyperSDK] Fulfilment window expired for order ${orderId}.`);
    stopPolling();
  }, 15 * 60 * 1000);
}

function stopPolling(): void {
  if (_pollingInterval) {
    clearInterval(_pollingInterval);
    _pollingInterval = null;
  }
  if (_fulfilmentWindowTimer) {
    clearTimeout(_fulfilmentWindowTimer);
    _fulfilmentWindowTimer = null;
  }
}

// ─────────────────────────────────────────────────────────────
// Cleanup — call on unmount or full logout
// ─────────────────────────────────────────────────────────────
export function unregisterHyperCallbackHandler(): void {
  if (_hyperEventListener) {
    _hyperEventListener.remove();
    _hyperEventListener = null;
  }
  stopPolling();
  _isInitialised = false;
  _pendingOrderId = null;
  _pendingAmount = null;
  _pendingCustomerId = null;
}