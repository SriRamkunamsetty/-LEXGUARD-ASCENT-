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

  private get collection() {
    return FirebaseAdminService.getInstance().getFirestore().collection("document_cache");
  }

  static generateHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  async checkCache(fileHash: string): Promise<ContractAnalysis | null> {
    const doc = await this.collection.doc(fileHash).get();
    if (doc.exists) {
      return doc.data()?.analysis as ContractAnalysis;
    }
    return null;
  }

  async saveCache(fileHash: string, analysis: ContractAnalysis): Promise<void> {
    await this.collection.doc(fileHash).set({
      analysis,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}
