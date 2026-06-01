// src/services/cashfree/CashfreeService.web.ts

// @ts-ignore - Suppressing TS error for missing declaration files in Cashfree JS SDK
import { load } from '@cashfreepayments/cashfree-js';

export const startCashfreePayment = async (
  paymentSessionId: string,
  orderId: string,
  onSuccess: (orderId: string) => void,
  onError: (error: any, orderId: string) => void
) => {
  try {
    const cashfree = await load({
      mode: "sandbox" // Change to "production" for live
    });

    if (!cashfree) {
      throw new Error("Failed to load Cashfree Web SDK");
    }

    const checkoutOptions = {
      paymentSessionId: paymentSessionId,
      redirectTarget: "_modal", // Opens Cashfree as a popup modal on the web
    };

    cashfree.checkout(checkoutOptions).then((result: any) => {
      if (result.error) {
        onError(result.error, orderId);
      } else if (result.paymentDetails) {
        onSuccess(orderId);
      } else if (result.redirect) {
        console.log("Redirecting to Cashfree...");
      }
    });
  } catch (error) {
    onError(error, orderId);
  }
};

export const removeCashfreeCallback = () => {
  // Web handles callbacks via promises, no cleanup needed
};