import { Buffer } from 'buffer'; // Ensure you have installed this: npm install buffer

// ⚠️ REPLACE WITH YOUR TEST KEYS
const RAZORPAY_KEY_ID = 'rzp_test_SAMhkX5Fl1FrAf'; 
const RAZORPAY_KEY_SECRET = 'FUlWoWrGJ0JvlYfd0Iflb23F';

interface GSTResponse {
  isValid: boolean;
  legalName?: string;
  address?: string;
  message?: string;
}

export const verifyGSTAndFetchDetails = async (gstNumber: string): Promise<GSTResponse> => {
  // 1. Sanitize input
  const cleanGST = gstNumber.toUpperCase().trim();
  
  // 2. Simple Regex Check (Structure only, NO Checksum Math)
  // This just checks: 2 numbers + 5 letters + 4 numbers + 1 letter + 1 number/letter + Z + 1 number/letter
  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!GST_REGEX.test(cleanGST)) {
    return { isValid: false, message: 'Invalid Format. Example: 22AAAAA0000A1Z5' };
  }

  try {
    // 3. Create Authorization Header
    const credentials = `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    // 4. Call Razorpay API
    const response = await fetch(`https://api.razorpay.com/v1/gst/verification?gstin=${cleanGST}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.gstin_status === 'Active') {
      return { 
        isValid: true, 
        legalName: data.legal_name,
        address: `${data.addr_bnm}, ${data.addr_st} - ${data.addr_pncd}` 
      };
    } else if (data.error) {
       console.error("Razorpay API Error:", data.error);
       return { isValid: false, message: data.error.description || 'Verification failed.' };
    } else {
       return { isValid: false, message: `GSTIN is ${data.gstin_status || 'Inactive'}` };
    }

  } catch (error) {
    console.error("Network Error:", error);
    return { isValid: false, message: 'Network connection failed.' };
  }
};