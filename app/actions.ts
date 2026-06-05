'use server';

import { GoogleGenAI } from '@google/genai';

export async function generateChatResponse(prompt: string, customSystemPrompt: string = 'You are a helpful AI assistant.') {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${customSystemPrompt}\n\nUser: ${prompt}` }]
        }
      ]
    });
    
    return { success: true, text: response.text || 'No response.' };
  } catch (error: any) {
    console.error('Gemini error:', error);
    if (error?.status === 503 || error?.message?.includes('503')) {
      return { success: false, error: 'AI Gateway Error: Model is currently experiencing high demand. Please try again later.' };
    }
    return { success: false, error: 'AI Gateway Error: ' + (error?.message || 'Ensure GEMINI_API_KEY is configured.') };
  }
}

export async function generateTerminalResponse(prompt: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `You are an AI assistant integrated into a web-based operating system terminal (Anichisom OS). Respond concisely and technically to the user's prompt as if it's a CLI output. Prompt: ${prompt}` }]
        }
      ]
    });
    
    return { success: true, text: response.text || 'No response.' };
  } catch (error: any) {
    console.error('Gemini error:', error);
    if (error?.status === 503 || error?.message?.includes('503')) {
      return { success: false, error: 'AI Gateway Error: Model is currently experiencing high demand. Please try again later.' };
    }
    return { success: false, error: 'AI Gateway Error: ' + (error?.message || 'Ensure GEMINI_API_KEY is configured.') };
  }
}
