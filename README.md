<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1CRdhOxX-eeEvsGhFpdB-pFrfJqNa7qlE

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Juspay HyperCheckout

Marketplace and subscription checkout use Juspay HyperCheckout through Firebase Functions. For sandbox, use the sandbox Juspay Portal at <https://sandbox.portal.juspay.in> and configure these non-key settings in `functions/.env`:

- `JUSPAY_MERCHANT_ID`
- `JUSPAY_CLIENT_ID`
- `JUSPAY_API_KEY`
- `JUSPAY_API_URL=https://sandbox.juspay.in/session`
- `JUSPAY_RETURN_URL=https://asia-south1-prochemapp-dev.cloudfunctions.net/juspayReturn`
- `JUSPAY_WEBHOOK_USERNAME`
- `JUSPAY_WEBHOOK_PASSWORD`

The Session API URL is a Juspay endpoint, not a dashboard value. The sandbox Order Status API base is `https://sandbox.juspay.in/orders/`; production uses `https://api.dbs.bank.in/session` and `https://api.dbs.bank.in/orders/` respectively. Keep the API key and webhook credentials server-side.

### Sandbox Dashboard

1. In the sandbox portal, confirm the merchant ID, Payment Page Client ID, API key, and that HyperCheckout is enabled.
2. Open **Payments → Settings → Webhook**. Set the URL to `https://asia-south1-prochemapp-dev.cloudfunctions.net/juspayWebhook`, configure Basic Auth with the same webhook username/password as the Functions environment, and enable order-succeeded/transaction-charged events.
3. Open **Payments → Settings → Security → JWT Keys** and create a merchant/Juspay key pair. Download and securely retain the merchant private key and Juspay public key/certificate. Never put either key in the app, Git, or chat.
4. Store those PEM files in Firebase Secret Manager, using the exact secret names consumed by the Functions:
   `firebase functions:secrets:set JUSPAY_MERCHANT_PRIVATE_KEY --data-file <path-to-merchant-private-key.pem>`
   `firebase functions:secrets:set JUSPAY_PUBLIC_KEY --data-file <path-to-juspay-public-key.pem>`
   The Functions decrypt the encrypted Order Status API response and verify its signature before fulfillment.
5. Deploy the Juspay Functions and then run a sandbox payment end to end. Confirm the order/user Firestore record changes only after a verified `CHARGED` result.

The payment return endpoint is separate from the webhook endpoint. Set `JUSPAY_RETURN_URL` to the `juspayReturn` HTTPS function URL for each Firebase project. Firebase Functions run on Node.js 22; deploy the four Juspay functions with `firebase deploy --only "functions:createJuspaySession,functions:getJuspayOrderStatus,functions:juspayWebhook,functions:juspayReturn" --project <firebase-project-id>`.

For production, replace the sandbox Session API URL with `https://api.dbs.bank.in/session`, use the production Juspay credentials and production JWT key pair, and set `JUSPAY_RETURN_URL` and the webhook URL to the production Firebase project's function URLs. Never point the production EAS build at a development Firebase project.

### Production Cutover

The production EAS profile and `.firebaserc` currently target `prochemapp-dev` (the project ID supplied for this cutover). Confirm that this is intentionally the live Firebase project before deploying real payments.

1. In the production Juspay Portal at <https://portal.juspay.in>, confirm the production MID/CID and generate a new active production API key. Do not reuse a sandbox API key.
2. Update `functions/.env` locally with the production values: `JUSPAY_MERCHANT_ID`, `JUSPAY_CLIENT_ID`, `JUSPAY_API_KEY`, `JUSPAY_WEBHOOK_USERNAME`, `JUSPAY_WEBHOOK_PASSWORD`, `JUSPAY_API_URL=https://api.dbs.bank.in/session`, and `JUSPAY_RETURN_URL=https://asia-south1-prochemapp-dev.cloudfunctions.net/juspayReturn`.
3. In the production Portal, configure **Payments → Settings → Webhook** with `https://asia-south1-prochemapp-dev.cloudfunctions.net/juspayWebhook`, matching production webhook Basic Auth credentials, and the charged/succeeded events.
4. In **Payments → Settings → Security → JWT Keys**, generate/download the production merchant private key and Juspay public key. Store them in Secret Manager without committing the PEM files:
   `firebase functions:secrets:set JUSPAY_MERCHANT_PRIVATE_KEY --data-file <merchant-private-key.pem> --project prochemapp-dev`
   `firebase functions:secrets:set JUSPAY_PUBLIC_KEY --data-file <juspay-public-key.pem> --project prochemapp-dev`
5. Deploy only the Juspay functions, then run low-value production smoke payments for both subscription and product checkout before broad release.

The root `.env` and `functions/.env` currently have different Juspay API keys. The previously exposed production key should be rotated; enter the new production API key directly into `functions/.env` and do not copy it into source code or this documentation.
