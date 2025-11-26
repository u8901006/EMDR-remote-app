import { Language } from '../types';

const SYSTEM_INSTRUCTION = `You are an empathetic, professional clinical assistant for an EMDR therapist. 
Your role is to assist the therapist by suggesting grounding techniques, summarizing session notes, or providing script suggestions for resource installation. 
Keep responses concise, clinical yet warm, and focused on safety and stabilization. 
Do not diagnose. Focus on facilitating the therapy process.`;

export const generateAssistantResponse = async (
  prompt: string, 
  history: { role: 'user' | 'model', text: string }[] = [],
  language: Language = 'en'
): Promise<string> => {
  
  try {
    let languageInstruction = "";
    if (language === 'zh-TW') {
        languageInstruction = "IMPORTANT: Please reply in Traditional Chinese (繁體中文).";
    }

    const payload = {
      prompt: `${languageInstruction}\n${prompt}`,
      history,
      systemInstruction: SYSTEM_INSTRUCTION
    };

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text || "I couldn't generate a response at this time.";

  } catch (error) {
    console.error("AI Service Error:", error);
    return "Sorry, I encountered an error connecting to the AI assistant. Please ensure the backend is configured correctly.";
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