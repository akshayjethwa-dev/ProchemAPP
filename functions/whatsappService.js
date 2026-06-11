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
  
  const formattedTo = normalizedNumber.startsWith("whatsapp:") ? normalizedNumber : `whatsapp:${normalizedNumber}`;

  // 🚀 FIX: Prepare Firestore Logging Data FIRST
  // This guarantees that if the function crashes for ANY reason, the error is logged.
  const db = admin.firestore();
  const logData = {
    direction: "outbound",
    toNumber: formattedTo,
    body: body || "No Body Content", 
    templateName: logMeta.templateName || "Standard_Reply",
    messageType: logMeta.type || "service", 
    targetUserId: logMeta.userId || null,
    conversationId: logMeta.conversationId || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: "pending" // Initial status
  };

  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials not configured in environment.");
    }

    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const formattedFrom = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;

    const messagePayload = {
      to: formattedTo,
    };

    // Use Twilio's Content API for templates
    if (logMeta.templateSid) {
      messagePayload.contentSid = logMeta.templateSid;
      
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
      // Legacy free-form text 
      messagePayload.from = formattedFrom;
      messagePayload.body = body;
      
      if (mediaUrl) {
        messagePayload.mediaUrl = mediaUrl;
      }
    }

    const message = await twilioClient.messages.create(messagePayload);
    console.log(`✅ WhatsApp sent successfully to ${formattedTo}. SID: ${message.sid}`);
    
    logData.status = "sent";
    logData.messageSid = message.sid;
    await db.collection("whatsappLogs").add(logData);
    
    return message.sid;
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp message to ${formattedTo}:`, error);
    
    // 🚀 FIX: Log the exact failure to the database so you can see it in your Admin Panel
    logData.status = "failed";
    logData.error = error.message || "Unknown execution error";
    await db.collection("whatsappLogs").add(logData);
    
    throw error;
  }
}

module.exports = { sendWhatsApp };