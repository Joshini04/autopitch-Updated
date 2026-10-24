// AutoPitch AI: Express API.
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const pool = require('./db/pool');
const { findLookalikeCompanies } = require('./stages/lookalike');
const { findDecisionMakers } = require('./stages/prospeo');
const { filterWithEmail } = require('./stages/emailFilter');
const { sendOne } = require('./stages/brevo');
const { analyzeLead } = require('./ai/analyzeLead');
const { addKnowledge, searchKnowledge } = require('./ai/knowledge');

const app = express();
app.use(cors());
app.use(express.json());

const isQuotaError = (err) => /429|RESOURCE_EXHAUSTED/.test(String(err.message));

app.get('/health', (req, res) => res.json({ ok: true }));

// ---------- Knowledge base (the notes the AI is allowed to use) ----------

// Save a note: chunk it, embed each chunk, store it in pgvector.
app.post('/knowledge', async (req, res) => {
  try {
    const { sourceName, text } = req.body;
    if (!sourceName || !text) {
      return res.status(400).json({ error: 'sourceName and text are required' });
    }
    const chunks = await addKnowledge(sourceName, text);
    res.json({ saved: true, chunks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Saving knowledge failed', details: err.message });
  }
});

// Show which notes are closest in meaning to a query (the retrieval step of RAG).
app.post('/knowledge/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query is required' });
    res.json(await searchKnowledge(query));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

// ---------- Leads ----------

app.get('/leads', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM leads ORDER BY score DESC NULLS LAST');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load leads', details: err.message });
  }
});

// Find similar companies, find their decision makers, save the ones with an email.
// No AI analysis happens here; leads start as "new".
app.post('/pipeline/run', async (req, res) => {
  try {
    const { seedDomain } = req.body;
    if (!seedDomain) return res.status(400).json({ error: 'seedDomain is required' });

    const companies = await findLookalikeCompanies(seedDomain);
    const contacts = await findDecisionMakers(companies);
    const withEmails = filterWithEmail(contacts);

    const existing = await pool.query('SELECT email FROM leads WHERE email IS NOT NULL');
    const seen = new Set(existing.rows.map(r => r.email));
    const fresh = withEmails.filter(c => !seen.has(c.email));

    for (const c of fresh) {
      await pool.query(
        `INSERT INTO leads (name, title, email, domain, status) VALUES ($1,$2,$3,$4,'new')`,
        [c.name, c.title, c.email, c.domain]
      );
    }

    res.json({
      companies: companies.length,
      domains: companies,
      found: contacts.length,
      withEmail: withEmails.length,
      saved: fresh.length,
      alreadyHad: withEmails.length - fresh.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Pipeline failed', details: err.message });
  }
});

// AI analysis for one lead: research -> score -> email draft.
app.post('/leads/:id/analyze', async (req, res) => {
  try {
    const { criteria, senderName } = req.body;
    if (!criteria) return res.status(400).json({ error: 'criteria is required' });
    res.json(await analyzeLead(req.params.id, criteria, senderName));
  } catch (err) {
    console.error(err);
    res.status(isQuotaError(err) ? 429 : 500).json({ error: 'Analysis failed', details: err.message });
  }
});

// AI analysis for the next N unanalyzed leads, spread across different companies.
app.post('/leads/analyze-batch', async (req, res) => {
  try {
    const { criteria, senderName, count = 5 } = req.body;
    if (!criteria) return res.status(400).json({ error: 'criteria is required' });

    const { rows } = await pool.query("SELECT id, domain FROM leads WHERE status = 'new' ORDER BY id");

    // take one person per company in turn, so the batch covers different companies
    const byDomain = {};
    for (const r of rows) (byDomain[r.domain] ||= []).push(r);
    const queues = Object.values(byDomain);
    const picked = [];
    while (picked.length < count && queues.some(q => q.length)) {
      for (const q of queues) {
        if (q.length && picked.length < count) picked.push(q.shift());
      }
    }

    const results = [];
    for (const p of picked) {
      try {
        results.push(await analyzeLead(p.id, criteria, senderName));
      } catch (err) {
        results.push({ id: p.id, error: err.message });
        if (isQuotaError(err)) break; // stop early when the free AI quota is used up
      }
      await new Promise(resolve => setTimeout(resolve, 4000)); // be gentle with free-tier limits
    }

    const done = results.filter(r => !r.error).length;
    res.json({ analyzed: done, remaining: rows.length - done, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Batch failed', details: err.message });
  }
});

// ---------- Approval and sending ----------

// The user approves the (possibly edited) email. With DRY_RUN anything but "false",
// nothing is sent; the approval is only recorded.
app.post('/leads/:id/approve', async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'subject and body are required' });

    const { rows } = await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    const lead = rows[0];
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!lead.email) return res.status(400).json({ error: 'This lead has no email address' });
    if (lead.status === 'sent') return res.status(400).json({ error: 'Already sent' });

    const draft = JSON.stringify({ subject, body });

    if (process.env.DRY_RUN !== 'false') {
      await pool.query('UPDATE leads SET email_draft = $1, status = $2 WHERE id = $3',
        [draft, 'approved_dry_run', lead.id]);
      return res.json({ message: 'Approved (dry run: nothing was sent)' });
    }

    await sendOne({ to: lead.email, toName: lead.name, subject, text: body });
    await pool.query('UPDATE leads SET email_draft = $1, status = $2 WHERE id = $3',
      [draft, 'sent', lead.id]);
    res.json({ message: `Email sent to ${lead.email}` });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: 'Approve failed',
      details: err.response?.data ? JSON.stringify(err.response.data) : err.message
    });
  }
});

app.post('/leads/:id/reject', async (req, res) => {
  try {
    await pool.query('UPDATE leads SET status = $1 WHERE id = $2', ['rejected', req.params.id]);
    res.json({ message: 'Lead rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Reject failed', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AutoPitch AI server running on http://localhost:${PORT}`);
  console.log(process.env.DRY_RUN === 'false'
    ? 'Sending is ON: approving a lead sends a real email.'
    : 'Dry-run mode: approving a lead does not send anything.');
});
