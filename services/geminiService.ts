
import { GoogleGenAI } from "@google/genai";

// Fix: Correctly initialize GoogleGenAI with process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getChemicalAssistance = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional chemical procurement assistant for Prochem Pvt Ltd. Help the user with this query: ${query}. Provide safety information, common industrial uses, and handling tips for the chemicals mentioned.`,
    });
    // Fix: Accessing .text as a property (not a method) is correct
    return response.text;
  } catch (error) {
    console.error("Gemini assistance error:", error);
    return "I'm sorry, I'm having trouble processing your request. Please try again later.";
  }
};
