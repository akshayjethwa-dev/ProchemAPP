import { CFPaymentGatewayService } from 'react-native-cashfree-pg-sdk';
import { CFDropCheckoutPayment, CFEnvironment, CFSession, CFThemeBuilder } from 'cashfree-pg-api-contract';

export const startCashfreePayment = async (
  paymentSessionId: string,
  orderId: string,
  onSuccess: (orderId: string) => void,
  onError: (error: any, orderId: string) => void
) => {
  try {
    CFPaymentGatewayService.setCallback({
      onVerify(orderID: string) {
        onSuccess(orderID);
      },
      onError(error: any, orderID: string) {
        onError(error, orderID);
      }
    });

    const session = new CFSession(
      paymentSessionId,
      orderId,
      CFEnvironment.SANDBOX // Change to PRODUCTION for live
    );

    const cfTheme = new CFThemeBuilder()
      .setNavigationBarBackgroundColor('#1E3A8A')
      .setNavigationBarTextColor('#FFFFFF')
      .setButtonBackgroundColor('#1E3A8A')
      .setButtonTextColor('#FFFFFF')
      .setPrimaryTextColor('#212121')
      .setSecondaryTextColor('#757575')
      .build();

    const dropPayment = new CFDropCheckoutPayment(session, null, cfTheme);
    CFPaymentGatewayService.doPayment(dropPayment);
  } catch (error) {
    onError(error, orderId);
  }
};

export const removeCashfreeCallback = () => {
  CFPaymentGatewayService.removeCallback();
};