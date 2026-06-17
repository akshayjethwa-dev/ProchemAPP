// src/utils/profileCompletion.ts
import { User } from '../types';

export const getProfileCompletion = (user: User | any) => {
  // 🚀 UPDATED: New weights incorporating the mobile number (phone)
  const fields = [
    { key: 'name', weight: 10 },
    { key: 'companyName', weight: 20 },
    { key: 'email', weight: 20 },
    { key: 'gstNumber', weight: 25 },
    { key: 'phone', weight: 25 },
  ] as const;

  const missingFields: string[] = [];
  let score = 0;

  fields.forEach(f => {
    // Check if the field exists and is not just an empty string
    if (user[f.key] && String(user[f.key]).trim() !== '') {
      score += f.weight;
    } else {
      missingFields.push(f.key);
    }
  });

  return { 
    percentage: score, 
    isComplete: score === 100, 
    missingFields 
  };
};