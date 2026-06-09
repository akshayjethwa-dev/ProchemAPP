// File: functions/whatsappService.js
const twilio = require("twilio");
const admin = require("firebase-admin");

async function sendWhatsApp(toNumber, body, mediaUrl = null, logMeta = {}) {
  
  // Normalize Indian numbers
  let normalizedNumber = toNumber.replace(/\s+/g, '').replace(/^whatsapp:/, '');
  if (normalizedNumber.length === 10 && !normalizedNumber.startsWith('91')) {
    normalizedNumber = '+91' + normalizedNumber; 
  } else if (normalizedNumber.length === 12 && normalizedNumber.startsWith('91')) {
    normalizedNumber = '+' + normalizedNumber;   
  }
  toNumber = normalizedNumber;

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.error("Missing Twilio environment variables.");
    throw new Error("Twilio credentials not configured.");
  }

  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const formattedTo = toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`;
  const formattedFrom = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;

  // 🚀 FIX: Dynamically construct payload based on whether it's a template
  const messagePayload = {
    to: formattedTo,
  };

  // Use Twilio's Content API for templates (Required outside 24hr window)
  if (logMeta.templateSid) {
    messagePayload.contentSid = logMeta.templateSid;
    
    // Content API strongly recommends/requires using a Messaging Service
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
      messagePayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    } else {
      messagePayload.from = formattedFrom; // Fallback
    }

    // Pass the dynamic variables (must be stringified JSON)
    if (logMeta.templateVariables) {
      messagePayload.contentVariables = JSON.stringify(logMeta.templateVariables);
    }
  } else {
    // Legacy free-form text (Only works for inbound replies within the 24-hr window)
    messagePayload.from = formattedFrom;
    messagePayload.body = body;
    
    if (mediaUrl) {
      messagePayload.mediaUrl = mediaUrl;
    }
  }

  // Prepare Firestore Logging Data (We keep logging the raw body locally)
  const db = admin.firestore();
  const logData = {
    direction: "outbound",
    toNumber: formattedTo,
    body: body, 
    templateName: logMeta.templateName || "Standard_Reply",
    messageType: logMeta.type || "service", 
    targetUserId: logMeta.userId || null,
    conversationId: logMeta.conversationId || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const message = await twilioClient.messages.create(messagePayload);
    console.log(`✅ WhatsApp sent successfully to ${formattedTo}. SID: ${message.sid}`);
    
    logData.status = "sent";
    logData.messageSid = message.sid;
    await db.collection("whatsappLogs").add(logData);
    
    return message.sid;
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp message to ${formattedTo}:`, error);
    
    logData.status = "failed";
    logData.error = error.message;
    await db.collection("whatsappLogs").add(logData);
    
    throw error;
  }
}

module.exports = { sendWhatsApp };