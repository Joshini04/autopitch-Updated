async function getEmails(contacts) {
  console.log(`\n🔍 Stage 3: Filtering contacts with emails...`);
  const withEmails = contacts.filter(c => c.email);
  console.log(`✅ Got emails for ${withEmails.length} contacts!`);
  return withEmails;
}

module.exports = { getEmails };