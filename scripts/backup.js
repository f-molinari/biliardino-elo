import 'dotenv/config';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

const COLLECTION = process.env.FIRESTORE_COLLECTION;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function backup() {
  console.log(`Reading collection: "${COLLECTION}"...`);

  const snapshot = await db.collection(COLLECTION).get();

  if (snapshot.empty) {
    console.warn('Collection is empty — writing empty array.');
  }

  const records = [];
  snapshot.forEach((doc) => {
    records.push({ id: doc.id, ...doc.data() });
  });

  console.log(`Fetched ${records.length} documents.`);

  // Build output path: backups/YYYY-MM-DD.json
  const today = new Date().toISOString().slice(0, 10); // e.g. "2026-03-11"
  const outputDir = path.resolve(import.meta.dirname, '..', 'backups');
  const outputFile = path.join(outputDir, `${today}.json`);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(records, null, 2), 'utf8');

  console.log(`Backup saved to: ${outputFile}`);
}

try {
  await backup();
} catch (err) {
  console.error('Backup failed:', err);
  process.exit(1);
}
