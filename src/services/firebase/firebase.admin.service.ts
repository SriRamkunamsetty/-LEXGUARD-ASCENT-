import * as admin from 'firebase-admin';
import { config } from '../../config/env';

export class FirebaseAdminService {
  private static instance: FirebaseAdminService;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): FirebaseAdminService {
    if (!FirebaseAdminService.instance) {
      FirebaseAdminService.instance = new FirebaseAdminService();
    }
    return FirebaseAdminService.instance;
  }

  private initialize() {
    if (admin.apps.length > 0) {
      return;
    }

    try {
      const projectId = config.FIREBASE_PROJECT_ID;
      const clientEmail = config.FIREBASE_CLIENT_EMAIL;
      const privateKey = config.parsedFirebasePrivateKey;

      if (!projectId || !clientEmail || !privateKey) {
        console.warn("[FirebaseAdminService] ⚠️ Missing required Firebase environment variables. Admin SDK initialization skipped.");
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      console.log("[FirebaseAdminService] ✅ Firebase Admin SDK initialized successfully.");
    } catch (error: any) {
      console.error("[FirebaseAdminService] ❌ Failed to initialize:", error.message || error);
    }
  }

  public getFirestore() {
    this.ensureInitialized();
    return admin.firestore();
  }

  private ensureInitialized() {
    if (admin.apps.length === 0) {
       console.warn("[FirebaseAdminService] Attempting to use Firebase Admin before successful initialization.");
    }
  }
}

