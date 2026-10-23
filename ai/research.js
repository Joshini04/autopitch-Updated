//ai/research.js: fetches the company’s homepage, then summarizes only what’s on it

const axios = require('axios');
const { callLLM } = require('./llm');

async function fetchHomepageText(domain) {
  try {
    const res = await axios.get(`https://${domain}`, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return String(res.data)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);
  } catch (err) {
    return '';
  }
}

async function researchCompany(lead) {
  const pageText = await fetchHomepageText(lead.domain);

  if (!pageText) {
    return { summary: 'Could not read this company website.', usedWebsite: false };
  }

  const prompt = `
You are a sales researcher. Using ONLY the website text below, write a 3-4 sentence
summary of what ${lead.domain} does, who its customers are, and anything notable.
If something is not in the text, do not guess.

Website text:
${pageText}
`;

  const summary = await callLLM(prompt);
  return { summary, usedWebsite: true };
}

module.exports = { researchCompany };