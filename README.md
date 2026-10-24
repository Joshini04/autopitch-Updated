# AutoPitch AI

An AI-assisted outreach platform. It finds decision makers at companies similar to a seed company, researches each company from its own website, scores how well each lead fits, and drafts a personalized email grounded in the user's own notes using retrieval-augmented generation (RAG). A human reviews, edits and approves every email before anything is sent.

This repository is the **backend** (Node.js + Express API). The React frontend is here: **[autopitch-ui](https://github.com/Joshini04/autopitch-ui)**.

## What it does

1. **Find contacts.** Takes a seed domain, asks an LLM for similar companies, and uses the Prospeo API to find decision makers (founders, C-suite, directors). Contacts with an email address are saved to PostgreSQL.
2. **Research.** Fetches the company's homepage and has the LLM summarize only what is on that page, so it does not invent facts.
3. **Score.** The LLM returns structured JSON (`score`, `fit`, `reasons`) judged against the user's own criteria.
4. **Draft with RAG.** The user's notes (projects, skills, background) are chunked, embedded and stored in PostgreSQL with pgvector. For each lead, the closest notes are retrieved by meaning and used as the only source of facts for the email.
5. **Approve.** The user edits and approves each draft in the UI. Only then is it sent through the Brevo email API.

```
Seed domain
   -> similar companies (LLM)
   -> decision makers with emails (Prospeo)
   -> saved as leads (PostgreSQL)
        -> research (website text -> LLM summary)
        -> score (structured JSON)
        -> retrieve relevant notes (pgvector similarity search)
        -> draft email (LLM, grounded in retrieved notes)
             -> human review and approval -> send (Brevo)
```

## Tech stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL on Neon, with the `pgvector` extension
- **AI:** Google Gemini API (text generation and embeddings), RAG, prompt engineering, structured JSON output
- **Integrations:** Prospeo (contact search), Brevo (email delivery)
- **Frontend:** React + Vite (separate repo)
- **Hosting:** Render

## Design decisions

- **Human in the loop.** The AI only drafts. Nothing is sent without an explicit approval click.
- **Dry-run mode.** With `DRY_RUN=true` (the default for deployments), approving a draft records the decision but sends nothing.
- **Grounded emails.** The prompt tells the model to use only the retrieved notes and company text, and not to claim anything that is not listed.
- **Built for free tiers.** Research is reused for contacts at the same company, analysis runs in small batches with pauses between calls, and a lead is analyzed only when requested.

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/pipeline/run` | Find companies and contacts, save leads with emails |
| GET | `/leads` | List saved leads |
| POST | `/leads/:id/analyze` | Research, score and draft for one lead |
| POST | `/leads/analyze-batch` | Analyze the next N unanalyzed leads |
| POST | `/leads/:id/approve` | Save the edited email and send it (or dry run) |
| POST | `/leads/:id/reject` | Reject a lead |
| POST | `/knowledge` | Add a note: chunk, embed, store |
| POST | `/knowledge/search` | Retrieve the closest notes for a query |
| POST | `/research` | Summarize a company from its website |
| POST | `/qualify` | Score a lead against criteria |
| POST | `/draft` | Draft an email using retrieved notes |

## Running locally

Requires Node.js 22 or newer and a PostgreSQL database with pgvector (Neon works on its free plan).

```bash
git clone https://github.com/Joshini04/autopitch-Updated.git
cd autopitch-Updated
npm install
```

Create a `.env` file:

```
GEMINI_API_KEY=
GEMINI_MODEL=
GEMINI_EMBED_MODEL=
DATABASE_URL=
PROSPEO_API_KEY=
BREVO_API_KEY=
DRY_RUN=true
PORT=3000
```

Create the tables:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id SERIAL PRIMARY KEY,
  source_name TEXT,
  content TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW()
);

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
```

Start the server:

```bash
node server.js
```

Then run the frontend from the [autopitch-ui](https://github.com/Joshini04/autopitch-ui) repo and point `VITE_API_URL` at this server.

## Known limitations

- **Lookalike companies come from the LLM.** The original design used a lookalike-company API that needed paid credits, so that stage now asks the LLM for similar companies and falls back to a fixed list if the call fails.
- **One page of contacts per search.** Prospeo returns its first page of results for each run.
- **No user accounts yet.** The API has no login, so a public deployment should run in dry-run mode with sample data.
- **Free-tier behavior.** The Render free instance sleeps after inactivity (the first request can take about a minute), and Gemini's free tier has daily request limits.

## Screenshots

_Add screenshots of the Leads screen, a drafted email and the Knowledge tab here._
