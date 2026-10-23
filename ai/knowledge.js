//ai/knowledge.js: stores chunks and searches them. This is the RAG core.

const pool = require('../db/pool');
const { chunkText } = require('./chunk');
const { embedTexts, embedText } = require('./embed');

const toVector = (arr) => `[${arr.join(',')}]`;

async function addKnowledge(sourceName, text) {
  const chunks = chunkText(text);
  const embeddings = await embedTexts(chunks);

  for (let i = 0; i < chunks.length; i++) {
    await pool.query(
      `INSERT INTO knowledge_chunks (source_name, content, embedding)
       VALUES ($1, $2, $3::vector)`,
      [sourceName, chunks[i], toVector(embeddings[i])]
    );
  }
  return chunks.length;
}

async function searchKnowledge(query, limit = 3) {
  const queryEmbedding = await embedText(query);

  const { rows } = await pool.query(
    `SELECT source_name, content, embedding <=> $1::vector AS distance
     FROM knowledge_chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [toVector(queryEmbedding), limit]
  );
  return rows;
}

module.exports = { addKnowledge, searchKnowledge };