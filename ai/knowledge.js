// The RAG core: stores the user's notes as embeddings and searches them by meaning.
const pool = require('../db/pool');
const { chunkText } = require('./chunk');
const { embedTexts, embedText } = require('./embed');

const toVector = (arr) => `[${arr.join(',')}]`;

// Chunk a note, embed every chunk, and store them in PostgreSQL (pgvector).
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

// Return the stored chunks closest in meaning to the query.
// "<=>" is pgvector's cosine distance: a smaller distance means a closer match.
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
