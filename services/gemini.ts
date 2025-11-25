import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Language } from '../types';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `You are an empathetic, professional clinical assistant for an EMDR therapist. 
Your role is to assist the therapist by suggesting grounding techniques, summarizing session notes, or providing script suggestions for resource installation. 
Keep responses concise, clinical yet warm, and focused on safety and stabilization. 
Do not diagnose. Focus on facilitating the therapy process.`;

export const generateAssistantResponse = async (
  prompt: string, 
  history: { role: 'user' | 'model', text: string }[] = [],
  language: Language = 'en'
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key is missing. Please check your configuration.";
  }

  try {
    const model = 'gemini-2.5-flash';
    
    let languageInstruction = "";
    if (language === 'zh-TW') {
        languageInstruction = "IMPORTANT: Please reply in Traditional Chinese (繁體中文).";
    }

    const fullPrompt = `
      ${languageInstruction}
      Context from previous interactions:
      ${history.map(h => `${h.role}: ${h.text}`).join('\n')}
      
      Current Request: ${prompt}
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    return response.text || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error connecting to the AI assistant.";
  }
};

export const suggestGroundingTechnique = async (clientStateDescription: string, language: Language = 'en'): Promise<string> => {
  let langRequest = "";
  if (language === 'zh-TW') {
      langRequest = "Provide the response in Traditional Chinese (繁體中文).";
  }

  const prompt = `Suggest a specific, brief grounding technique for a client who is currently experiencing: ${clientStateDescription}. 
  Provide the script the therapist can read directly to the client. ${langRequest}`;
  return generateAssistantResponse(prompt, [], language);
};