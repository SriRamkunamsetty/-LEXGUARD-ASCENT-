import * as admin from "firebase-admin";
import crypto from "crypto";
import { FirebaseAdminService } from "./firebase.admin.service";
import { ContractAnalysis } from "@/shared/contracts";

export class DocumentCacheService {
  private static instance: DocumentCacheService;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new DocumentCacheService();
    }
    return this.instance;
  }

  private l1Cache = new Map<string, ContractAnalysis>();

  private get collection() {
    return FirebaseAdminService.getInstance().getFirestore().collection("document_cache");
  }

  static generateHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  async checkCache(fileHash: string): Promise<ContractAnalysis | null> {
    // Check L1 In-Memory Cache first (sub-microsecond access)
    const l1Hit = this.l1Cache.get(fileHash);
    if (l1Hit) {
      return l1Hit;
    }

    // Fallback to L2 Firestore Cache
    const doc = await this.collection.doc(fileHash).get();
    if (doc.exists) {
      const analysis = doc.data()?.analysis as ContractAnalysis;
      if (analysis) {
        this.l1Cache.set(fileHash, analysis); // Populate L1
      }
      return analysis;
    }
    return null;
  }

  async saveCache(fileHash: string, analysis: ContractAnalysis): Promise<void> {
    this.l1Cache.set(fileHash, analysis); // Save to L1
    await this.collection.doc(fileHash).set({
      analysis,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}
