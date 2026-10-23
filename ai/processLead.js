const pool = require('../db/pool');
const { researchCompany } = require('./research');
const { qualifyLead } = require('./qualify');
const { draftEmail } = require('./draft');

async function analyzeLead(id, criteria, senderName) {
  const { rows } = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
  const lead = rows[0];
  if (!lead) throw new Error('Lead not found');

  // reuse the research of a colleague at the same company if we already have it
  const cached = await pool.query(
    'SELECT summary FROM leads WHERE domain = $1 AND summary IS NOT NULL LIMIT 1',
    [lead.domain]
  );
  const summary = cached.rows[0]?.summary || (await researchCompany(lead)).summary;

  const qualification = await qualifyLead(lead, summary, criteria);

  let draft = null;
  if (qualification.fit !== 'poor') {
    draft = await draftEmail(lead, summary, senderName);
  }

  await pool.query(
    `UPDATE leads
     SET summary = $1, score = $2, fit = $3, reasons = $4,
         email_draft = $5, sources_used = $6, status = $7
     WHERE id = $8`,
    [
      summary,
      qualification.score,
      qualification.fit,
      JSON.stringify(qualification.reasons),
      draft ? JSON.stringify({ subject: draft.subject, body: draft.body }) : null,
      draft ? JSON.stringify(draft.sources_used) : null,
      draft ? 'draft' : 'skipped',
      id
    ]
  );

  return { id, score: qualification.score, fit: qualification.fit };
}

module.exports = { analyzeLead };