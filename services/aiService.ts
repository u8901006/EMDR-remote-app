
import { Language, EMDRSettings, AIProvider } from '../types';

const SYSTEM_INSTRUCTION = `You are an empathetic, professional clinical assistant for an EMDR therapist. 
Your role is to assist the therapist by suggesting grounding techniques, summarizing session notes, or providing script suggestions for resource installation. 
Keep responses concise, clinical yet warm, and focused on safety and stabilization. 
Do not diagnose. Focus on facilitating the therapy process.`;

interface AIRequestPayload {
  prompt: string;
  history: { role: 'user' | 'model', text: string }[];
  language: Language;
  settings: EMDRSettings;
}

export const generateAssistantResponse = async ({
  prompt, 
  history = [],
  language = 'en',
  settings
}: AIRequestPayload): Promise<string> => {
  
  try {
    let languageInstruction = "";
    if (language === 'zh-TW') {
        languageInstruction = "IMPORTANT: Please reply in Traditional Chinese (繁體中文).";
    }

    // CLOUD MODE (Google Gemini)
    if (settings.aiProvider === AIProvider.CLOUD) {
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

        if (!response.ok) throw new Error(`Gemini Error: ${response.statusText}`);
        const data = await response.json();
        return data.text || "I couldn't generate a response.";
    } 
    // LOCAL MODE (Ollama)
    else {
        // Adapt format for Ollama's API
        // Typically Ollama expects "messages": [{role, content}, ...]
        const ollamaMessages = [
            { role: 'system', content: SYSTEM_INSTRUCTION + " " + languageInstruction },
            ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
            { role: 'user', content: prompt }
        ];

        const response = await fetch(`${settings.ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.ollamaModel || 'llama3',
                messages: ollamaMessages,
                stream: false
            })
        });

        if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);
        const data = await response.json();
        return data.message?.content || "Local AI provided no response.";
    }

  } catch (error: any) {
    console.error("AI Service Error:", error);
    return `AI Error: ${error.message || 'Connection failed'}. Check your ${settings.aiProvider === AIProvider.LOCAL ? 'Ollama' : 'Server'} settings.`;
  }
};

export const suggestGroundingTechnique = async (clientStateDescription: string, language: Language, settings: EMDRSettings): Promise<string> => {
  let langRequest = "";
  if (language === 'zh-TW') {
      langRequest = "Provide the response in Traditional Chinese (繁體中文).";
  }

  const prompt = `Suggest a specific, brief grounding technique for a client who is currently experiencing: ${clientStateDescription}. 
  Provide the script the therapist can read directly to the client. ${langRequest}`;
  
  return generateAssistantResponse({ prompt, history: [], language, settings });
};
