// Stage 4: send one approved email through the Brevo API.
// The sender address must be verified in Brevo and set in SENDER_EMAIL.
const axios = require('axios');

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendOne({ to, toName, subject, text }) {
  const senderEmail = process.env.SENDER_EMAIL;
  if (!senderEmail) throw new Error('SENDER_EMAIL is not set');

  const html = text
    .split('\n\n')
    .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: process.env.SENDER_NAME || 'Joshini', email: senderEmail },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent: html
    },
    { headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' } }
  );
}

module.exports = { sendOne };
