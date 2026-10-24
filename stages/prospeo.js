// Stage 2: find decision makers (C-suite, founders, directors) at the given companies.
const axios = require('axios');

async function findDecisionMakers(domains) {
  console.log(`\n🔍 Stage 2: Finding decision makers for ${domains.length} companies...`);

  const allContacts = [];

  try {
    const response = await axios.post(
      'https://api.prospeo.io/search-person',
      {
        page: 1,
        filters: {
          company: {
            websites: { include: domains }
          },
          person_seniority: {
            include: ['C-Suite', 'Founder/Owner', 'Director']
          }
        }
      },
      {
        headers: {
          'X-KEY': process.env.PROSPEO_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const results = response.data.results || [];

    for (const result of results) {
      const person = result.person;
      const company = result.company;
      if (person && company) {
        const email = person.email?.revealed ? person.email?.email : null;
        allContacts.push({
          name: `${person.first_name} ${person.last_name}`,
          person_id: person.person_id,
          email: email,
          domain: company.domain,
          title: person.current_job_title
        });
      }
    }
  } catch (error) {
    console.error('❌ Prospeo error:', error.response?.data || error.message);
  }

  console.log(`✅ Found ${allContacts.length} decision makers!`);
  return allContacts;
}

module.exports = { findDecisionMakers };
