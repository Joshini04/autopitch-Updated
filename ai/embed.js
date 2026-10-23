//ai/embed.js: turns text into number lists

const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';

async function embedTexts(texts) {
  const response = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: texts,
    config: { outputDimensionality: 768 }
  });
  return response.embeddings.map(e => e.values);
}

async function embedText(text) {
  const [vector] = await embedTexts([text]);
  return vector;
}

module.exports = { embedTexts, embedText };