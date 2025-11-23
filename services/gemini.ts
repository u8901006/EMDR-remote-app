import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize Gemini API
// NOTE: In a real production app, you should proxy this through a backend or use a secure way to handle keys.
// Since this is a client-side demo, we use the env var directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `You are an empathetic, professional clinical assistant for an EMDR therapist. 
Your role is to assist the therapist by suggesting grounding techniques, summarizing session notes, or providing script suggestions for resource installation. 
Keep responses concise, clinical yet warm, and focused on safety and stabilization. 
Do not diagnose. Focus on facilitating the therapy process.`;

export const generateAssistantResponse = async (
  prompt: string, 
  history: { role: 'user' | 'model', text: string }[] = []
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key is missing. Please check your configuration.";
  }

  try {
    const model = 'gemini-2.5-flash';
    
    // Format history for context if needed, though for simple helper requests single-turn is often enough.
    // We will just append previous context to the prompt for simplicity in this helper.
    const fullPrompt = `
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

export const suggestGroundingTechnique = async (clientStateDescription: string): Promise<string> => {
  const prompt = `Suggest a specific, brief grounding technique for a client who is currently experiencing: ${clientStateDescription}. 
  Provide the script the therapist can read directly to the client.`;
  return generateAssistantResponse(prompt);
};