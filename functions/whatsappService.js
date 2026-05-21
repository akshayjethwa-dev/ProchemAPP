// File: functions/whatsappService.js
const twilio = require("twilio");

/**
 * Reusable WhatsApp Service
 * Sends a WhatsApp message using Twilio.
 *
 * @param {string} toNumber - The recipient's phone number (with country code, e.g., +919876543210)
 * @param {string} body - The text message to send
 * @param {string} [mediaUrl] - Optional URL to a media file (image, pdf, etc.)
 * @returns {Promise<string>} - The Twilio Message SID
 */
async function sendWhatsApp(toNumber, body, mediaUrl = null) {
  // 1. Verify credentials exist
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.error("Missing Twilio environment variables.");
    throw new Error("Twilio credentials not configured.");
  }

  // 2. Initialize Twilio client
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  // 3. Format numbers to ensure they have the "whatsapp:" prefix
  const formattedTo = toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`;
  const formattedFrom = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;

  // 4. Construct message payload
  const messagePayload = {
    from: formattedFrom,
    to: formattedTo,
    body: body,
  };

  // Add mediaUrl if provided
  if (mediaUrl) {
    messagePayload.mediaUrl = mediaUrl;
  }

  // 5. Send message and handle errors
  try {
    const message = await twilioClient.messages.create(messagePayload);
    console.log(`✅ WhatsApp message sent successfully to ${formattedTo}. SID: ${message.sid}`);
    return message.sid;
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp message to ${formattedTo}:`, error);
    throw error; // Throw error so the calling function knows it failed
  }
}

module.exports = { sendWhatsApp };