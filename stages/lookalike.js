// Stage 1: find companies similar to a seed domain.
// An LLM suggests them; if the call fails, a fixed fallback list is used.
const { callLLM } = require('../ai/llm');

const FALLBACK = ['braintree.com', 'square.com', 'payoneer.com', 'adyen.com', 'razorpay.com'];

async function findLookalikeCompanies(seedDomain) {
  console.log(`\n🔍 Stage 1: Finding companies similar to ${seedDomain}...`);

  try {
    const prompt = `
List 5 real companies similar to ${seedDomain}: same industry, similar products and customers.
Return ONLY JSON in this shape: {"domains": ["example.com", "another.com"]}
Use website domains only, with no https:// and no www. Do not include ${seedDomain}.
`;
    const raw = await callLLM(prompt, { json: true });

    const domains = (JSON.parse(raw).domains || [])
      .map(d => String(d).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''))
      .filter(d => d && d !== seedDomain)
      .slice(0, 5);

    if (domains.length > 0) {
      console.log(`✅ Found ${domains.length} lookalike companies:`, domains);
      return domains;
    }
  } catch (err) {
    console.error('❌ Lookalike AI error, using fallback list:', err.message);
  }

  const lookalikes = FALLBACK.filter(d => d !== seedDomain);
  console.log(`⚠️  Using ${lookalikes.length} fallback companies.`);
  return lookalikes;
}

module.exports = { findLookalikeCompanies };
