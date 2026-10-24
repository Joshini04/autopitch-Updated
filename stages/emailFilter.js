// Stage 3: keep only the contacts that have a revealed email address.
function filterWithEmail(contacts) {
  console.log('\n🔍 Stage 3: Keeping contacts that have an email...');
  const withEmails = contacts.filter(c => c.email);
  console.log(`✅ ${withEmails.length} of ${contacts.length} contacts have an email.`);
  return withEmails;
}

module.exports = { filterWithEmail };
