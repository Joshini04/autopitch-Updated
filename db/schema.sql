-- Run this once in your PostgreSQL database (for example Neon's SQL editor).

CREATE EXTENSION IF NOT EXISTS vector;

-- The user's own notes, split into chunks with their embeddings (the RAG memory)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id SERIAL PRIMARY KEY,
  source_name TEXT,
  content TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contacts found by the pipeline, plus the AI's research, score and email draft
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name TEXT,
  title TEXT,
  email TEXT,
  domain TEXT,
  summary TEXT,
  score INT,
  fit TEXT,
  reasons JSONB,
  email_draft TEXT,
  sources_used JSONB,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);
