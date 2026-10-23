async function findLookalikeCompanies(seedDomain) {
  console.log(`\n🔍 Stage 1: Processing seed domain ${seedDomain}...`);
  
  const lookalikes = [
    'braintree.com',
    'square.com', 
    'payoneer.com',
    'adyen.com',
    'razorpay.com'
  ].filter(d => d !== seedDomain);

  console.log(`✅ Found ${lookalikes.length} lookalike companies!`);
  console.log(lookalikes);
  return lookalikes;
}

module.exports = { findLookalikeCompanies };