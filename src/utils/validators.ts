export const validateGST = (gst: string) => {
  // Empty GST is allowed (unless you want it strictly required), but if filled, it must match format.
  if (!gst || gst.trim() === '') return true; 
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.toUpperCase());
};

export const validatePassword = (pwd: string) => {
  if (!pwd || pwd.trim() === '') return true;
  return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
};