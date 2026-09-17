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

Marketplace checkout uses the Juspay HyperCheckout Session API through Firebase Functions. Keep these values in the Functions runtime environment only:

- `JUSPAY_MERCHANT_ID`
- `JUSPAY_CLIENT_ID`
- `JUSPAY_API_KEY`
- `JUSPAY_WEBHOOK_USERNAME`
- `JUSPAY_WEBHOOK_PASSWORD`

Deploy the Functions, then configure the Juspay dashboard webhook URL as:
`https://asia-south1-<firebase-project-id>.cloudfunctions.net/juspayWebhook`

The webhook must use the same Basic Auth username and password configured above. The app verifies payment with `getJuspayOrderStatus`; it does not trust the client-side checkout result alone.
