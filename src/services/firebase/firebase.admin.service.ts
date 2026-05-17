import * as admin from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { config } from "../../config/env";

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
      const projectId = config.FIREBASE_PROJECT_ID || config.GOOGLE_CLOUD_PROJECT;
      const clientEmail = config.FIREBASE_CLIENT_EMAIL;
      const privateKey = config.parsedFirebasePrivateKey;
      const isUsingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST || !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
        });

        console.log("[FirebaseAdminService] Firebase Admin SDK initialized with explicit service-account credentials.");
        return;
      }

      if (projectId) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId,
        });

        console.log("[FirebaseAdminService] Firebase Admin SDK initialized with application default credentials.");
        return;
      }

      if (isUsingEmulator) {
        admin.initializeApp({
          projectId: projectId || "lexguard-local-emulator",
        });

        console.log("[FirebaseAdminService] Firebase Admin SDK initialized for emulator mode.");
        return;
      }

      console.warn("[FirebaseAdminService] Missing Firebase project configuration. Admin SDK initialization skipped.");
    } catch (error: any) {
      console.error("[FirebaseAdminService] Failed to initialize:", error.message || error);
    }
  }

  public getFirestore() {
    this.ensureInitialized();
    return config.FIREBASE_DATABASE_ID
      ? getAdminFirestore(admin.app(), config.FIREBASE_DATABASE_ID)
      : admin.firestore();
  }

  public async verifyIdToken(token: string) {
    this.ensureInitialized();
    return admin.auth().verifyIdToken(token);
  }

  private ensureInitialized() {
    if (admin.apps.length === 0) {
      throw new Error("Firebase Admin SDK is not initialized for backend authentication.");
    }
  }
}
