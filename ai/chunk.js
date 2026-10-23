//ai/chunk.js: cuts long text into overlapping pieces

function chunkText(text, size = 120, overlap = 20) {
  const words = text.trim().split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(' '));
    if (i + size >= words.length) break;
  }

  return chunks;
}

module.exports = { chunkText };