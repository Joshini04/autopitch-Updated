//ai/qualify.js: returns structured JSON, not free text

const { callLLM } = require('./llm');

async function qualifyLead(lead, summary, criteria) {
  const prompt = `
You are a lead qualification assistant.

My target customer criteria:
${criteria}

Lead: ${lead.name}, ${lead.title} at ${lead.domain}
Company summary: ${summary}

Return ONLY JSON in exactly this shape:
{"score": <integer 0-100>, "fit": "good" | "maybe" | "poor", "reasons": ["short reason", "short reason"]}
`;

  const raw = await callLLM(prompt, { json: true });

  try {
    return JSON.parse(raw);
  } catch (err) {
    return { score: 0, fit: 'poor', reasons: ['AI returned invalid JSON'], raw };
  }
}

module.exports = { qualifyLead };