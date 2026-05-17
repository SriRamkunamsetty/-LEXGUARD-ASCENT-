import admin from 'firebase-admin';

async function test() {
  try {
    admin.initializeApp({ projectId: 'sita-486706' });
    const db = admin.firestore();
    db.settings({ databaseId: 'ai-studio-1d5a80bd-9afa-4050-8dea-9aa81c64c6d0' });
    
    await db.collection('test').doc('test').set({ time: Date.now() });
    console.log("SUCCESS ADMIN FIRESTORE");
  } catch(e: any) {
    console.error("FAIL ADMIN FIRESTORE:", e.message);
  }
}
test();
