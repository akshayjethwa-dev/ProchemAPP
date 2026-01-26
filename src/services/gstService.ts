import { Alert } from 'react-native';

// Regex for standard Indian GSTIN format
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

interface GSTResponse {
  isValid: boolean;
  legalName?: string;
  message?: string;
}

/**
 * Validates GST Number Format and Status
 * @param gstNumber The 15-char GSTIN string
 */
export const validateGST = async (gstNumber: string): Promise<GSTResponse> => {
  // 1. Sanitize input
  const cleanGST = gstNumber.toUpperCase().trim();

  // 2. Regex Format Check (Instant & Free)
  if (!GST_REGEX.test(cleanGST)) {
    return { isValid: false, message: 'Invalid Format. Format should be like 22AAAAA0000A1Z5' };
  }

  // 3. API Validation (Simulated)
  try {
    console.log(`[Mock GST API] Checking ${cleanGST}...`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Fake network delay
    
    // ✅ CASE 1: Specific Mock for Testing Auto-fill
    // Only auto-fill if you use this specific number
    if (cleanGST === '22AAAAA0000A1Z5') {
       return { isValid: true, legalName: 'PROCHEM INDUSTRIES LTD' };
    }

    // ✅ CASE 2: Default for any other valid format
    // Return Valid = true, but NO legalName. 
    // This allows the user to type their own business name.
    return { isValid: true }; 
    
  } catch (error) {
    console.error("GST API Error", error);
    return { isValid: false, message: 'Server validation failed. Try again.' };
  }
};