import * as admin from "firebase-admin";
import { contractAnalysisSchema } from "../../shared/contracts";
import { FirebaseAdminService } from "./firebase.admin.service";

type CreateContractRecordInput = {
  userId: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
};

export class FirestoreContractsService {
  private static instance: FirestoreContractsService;

  public static getInstance() {
    if (!this.instance) {
      this.instance = new FirestoreContractsService();
    }

    return this.instance;
  }

  private get collection() {
    return FirebaseAdminService.getInstance().getFirestore().collection("contracts");
  }

  public async createPendingRecord(input: CreateContractRecordInput) {
    const docRef = await this.collection.add({
      userId: input.userId,
      originalName: input.originalName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      status: "processing",
      uploadDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return docRef.id;
  }

  public async markCompleted(contractId: string, analysis: unknown) {
    const validatedAnalysis = contractAnalysisSchema.parse(analysis);
    await this.collection.doc(contractId).set(
      {
        status: "completed",
        analysis: validatedAnalysis,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  public async markErrored(contractId: string, errorMessage: string) {
    await this.collection.doc(contractId).set(
      {
        status: "error",
        errorMessage,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}
