import * as admin from "firebase-admin";
import { FirebaseAdminService } from "./firebase.admin.service";

type ConsumeInput = {
  key: string;
  limit: number;
  windowMs: number;
};

type TransactionLike = {
  get(
    ref: { id: string },
  ): Promise<{
    exists: boolean;
    data(): { count?: number; resetAt?: number } | undefined;
  }>;
  set(ref: { id: string }, data: Record<string, unknown>, options?: { merge?: boolean }): void;
};

type FirestoreLike = {
  collection(name: string): {
    doc(id: string): { id: string };
  };
  runTransaction<T>(updateFn: (tx: TransactionLike) => Promise<T>): Promise<T>;
};

export interface RateLimitStore {
  consume(input: ConsumeInput): Promise<{ allowed: boolean; remaining: number }>;
}

export class FirestoreRateLimitService implements RateLimitStore {
  private static instance: FirestoreRateLimitService;
  constructor(private readonly firestore?: FirestoreLike) {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new FirestoreRateLimitService();
    }

    return this.instance;
  }

  private get db() {
    return this.firestore ?? FirebaseAdminService.getInstance().getFirestore();
  }

  private get collection() {
    return this.db.collection("rate_limits");
  }

  async consume(input: ConsumeInput) {
    const docRef = this.collection.doc(input.key);
    const now = Date.now();

    const result = await this.db.runTransaction(async (tx) => {
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
