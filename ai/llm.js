// Thin wrapper around the Gemini text-generation API.
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

// Returns the model's reply as text. With { json: true } the model answers in JSON.
async function callLLM(prompt, { json = false } = {}) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: json ? { responseMimeType: 'application/json' } : {}
  });
  return response.text;
}

module.exports = { callLLM };
