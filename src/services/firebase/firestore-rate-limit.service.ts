import * as admin from "firebase-admin";
import { FirebaseAdminService } from "./firebase.admin.service";

type ConsumeInput = {
  key: string;
  limit: number;
  windowMs: number;
};

export class FirestoreRateLimitService {
  private static instance: FirestoreRateLimitService;

  static getInstance() {
    if (!this.instance) {
      this.instance = new FirestoreRateLimitService();
    }

    return this.instance;
  }

  private get collection() {
    return FirebaseAdminService.getInstance().getFirestore().collection("rate_limits");
  }

  async consume(input: ConsumeInput) {
    const docRef = this.collection.doc(input.key);
    const now = Date.now();

    const result = await FirebaseAdminService.getInstance().getFirestore().runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const data = snap.data() as { count?: number; resetAt?: number } | undefined;
      const resetAt = data?.resetAt ?? 0;

      if (!snap.exists || resetAt <= now) {
        tx.set(docRef, {
          count: 1,
          resetAt: now + input.windowMs,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
          allowed: true,
          remaining: input.limit - 1,
        };
      }

      const nextCount = (data?.count ?? 0) + 1;
      tx.set(
        docRef,
        {
          count: nextCount,
          resetAt,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return {
        allowed: nextCount <= input.limit,
        remaining: Math.max(0, input.limit - nextCount),
      };
    });

    return result;
  }
}
