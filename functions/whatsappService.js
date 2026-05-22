// File: functions/whatsappService.js
const twilio = require("twilio");
const admin = require("firebase-admin");

/**
 * Reusable WhatsApp Service
 * Sends a WhatsApp message using Twilio and logs the event to Firestore.
 *
 * @param {string} toNumber - The recipient's phone number (with country code)
 * @param {string} body - The text message to send
 * @param {string} [mediaUrl] - Optional URL to a media file
 * @param {object} [logMeta] - Metadata for centralized logging { templateName, type, userId, conversationId }
 * @returns {Promise<string>} - The Twilio Message SID
 */
async function sendWhatsApp(toNumber, body, mediaUrl = null, logMeta = {}) {
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

  if (mediaUrl) {
    messagePayload.mediaUrl = mediaUrl;
  }

  // Prepare Firestore Logging Data
  const db = admin.firestore();
  const logData = {
    direction: "outbound",
    toNumber: formattedTo,
    body: body,
    templateName: logMeta.templateName || "Standard_Reply",
    messageType: logMeta.type || "service", // e.g., service, marketing, transactional
    targetUserId: logMeta.userId || null,
    conversationId: logMeta.conversationId || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  // 5. Send message and handle errors/logging
  try {
    const message = await twilioClient.messages.create(messagePayload);
    console.log(`✅ WhatsApp message sent successfully to ${formattedTo}. SID: ${message.sid}`);
    
    // Log success
    logData.status = "sent";
    logData.messageSid = message.sid;
    await db.collection("whatsappLogs").add(logData);
    
    return message.sid;
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp message to ${formattedTo}:`, error);
    
    // Log failure
    logData.status = "failed";
    logData.error = error.message;
    await db.collection("whatsappLogs").add(logData);
    
    throw error;
  }
}

module.exports = { sendWhatsApp };