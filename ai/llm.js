//ai/llm.js: your one function for calling the LLM

const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function callLLM(prompt, { json = false } = {}) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: json ? { responseMimeType: 'application/json' } : {}
  });
  return response.text;
}

module.exports = { callLLM };