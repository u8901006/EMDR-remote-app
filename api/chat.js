import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, history, systemInstruction } = req.body;

  // Prioritize server-side secure keys, fallback to VITE var if that's all that is set
  const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server API Key configuration missing.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';

    // Construct the conversation context
    // Note: For simple stateless requests, we concatenate history. 
    // For advanced use, we would use ai.chats.create, but this matches the previous logic.
    const fullPrompt = `
      ${systemInstruction || ''}
      
      Context from previous interactions:
      ${history ? history.map(h => `${h.role}: ${h.text}`).join('\n') : ''}
      
      Current Request: ${prompt}
    `;

    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        temperature: 0.7,
      }
    });

    return res.status(200).json({ text: response.text });

  } catch (error) {
    console.error("Gemini Backend Error:", error);
    return res.status(500).json({ error: 'Failed to generate response.' });
  }
}