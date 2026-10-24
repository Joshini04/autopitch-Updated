// Drafts a personalized email using RAG:
// the closest notes about the sender are retrieved and used as the only source of facts.
const { callLLM } = require('./llm');
const { searchKnowledge } = require('./knowledge');

async function draftEmail(lead, summary, senderName = 'Joshini') {
  // Retrieval: find the sender's notes closest in meaning to this company
  const chunks = await searchKnowledge(summary, 3);
  const knowledge = chunks.map(c => `- ${c.content}`).join('\n');
  const sourcesUsed = [...new Set(chunks.map(c => c.source_name))];

  const prompt = `
Write a short, polite cold email from ${senderName} to ${lead.name} (${lead.title} at ${lead.domain}).

About their company (from their website):
${summary}

About the sender (use ONLY this, do not invent anything else):
${knowledge}

Rules:
- Maximum 110 words, plain text, no placeholders like [Name].
- Open by saying you came across the company and mention one specific thing from the company text. Do NOT say you have been following, admiring, or loved their work.
- Pick only the ONE or TWO items from the sender's background that fit this company best. Do not list everything.
- Do not claim experience, skills, or results that are not listed above.
- End with a soft line saying you're happy to stop if this isn't relevant.
- Sign off with ${senderName}.

Return ONLY JSON: {"subject": "...", "body": "..."}
`;

  const raw = await callLLM(prompt, { json: true });

  try {
    const parsed = JSON.parse(raw);
    return { ...parsed, sources_used: sourcesUsed };
  } catch (err) {
    return { subject: '', body: raw, sources_used: sourcesUsed };
  }
}

module.exports = { draftEmail };
