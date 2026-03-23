// functions/migrate.js
const admin = require('firebase-admin');

// You need to generate a service account key from Firebase Settings > Service Accounts
// Save the JSON file in your functions folder and require it here:
const serviceAccount = require('./service-account-key.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function backfillUsers() {
  console.log("Starting migration...");
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  let batch = db.batch();
  let count = 0;
  let total = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.subscriptionTier === undefined) {
      batch.update(doc.ref, {
        subscriptionTier: 'FREE',
        subscriptionExpiry: null,
        paymentHistory: []
      });
      count++;
      total++;

      if (count >= 490) {
        await batch.commit();
        batch = db.batch();
        count = 0;
        console.log(`Committed ${total} users...`);
      }
    }
  }

  if (count > 0) {
    await batch.commit();
  }
  console.log(`Migration Complete! Total users updated: ${total}`);
}

backfillUsers().catch(console.error);