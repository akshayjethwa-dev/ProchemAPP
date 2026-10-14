// File: src/services/hyperSdk.web.ts
// ─────────────────────────────────────────────────────────────
// Web version — used automatically by Metro when bundling for web.
//
// The native HyperSDK (hyper-sdk-react) has no web implementation,
// so we stub out every export. Web payments use the WebView /
// payment_links.web flow inside CheckoutScreen.tsx instead.
// ─────────────────────────────────────────────────────────────

export function initiateHyperSdk(): void {
  console.log("[HyperSDK/web] initiateHyperSdk() — no-op on web. WebView flow will be used.");
}

export function openHyperCheckout(
  sdkPayload: Record<string, any>,
  orderId: string,
  amount?: number,
  customerId?: string
): void {
  console.log("[HyperSDK/web] openHyperCheckout() — no-op on web.", { orderId });
}

export function registerHyperCallbackHandler(
  onEvent: (event: string, data: any) => void
): void {
  console.log("[HyperSDK/web] registerHyperCallbackHandler() — no-op on web.");
}

export function unregisterHyperCallbackHandler(): void {
  console.log("[HyperSDK/web] unregisterHyperCallbackHandler() — no-op on web.");
}