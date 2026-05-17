import * as admin from "firebase-admin";
import { contractAnalysisSchema } from "../../shared/contracts";
import { FirebaseAdminService } from "./firebase.admin.service";

type CreateContractRecordInput = {
  userId: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
};

type ContractCollectionLike = {
  add(data: Record<string, unknown>): Promise<{ id: string }>;
  doc(id: string): {
    set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void>;
  };
};

export interface ContractsStore {
  createPendingRecord(input: CreateContractRecordInput): Promise<string>;
  markCompleted(contractId: string, analysis: unknown): Promise<void>;
  markErrored(contractId: string, errorMessage: string): Promise<void>;
}

export class FirestoreContractsService implements ContractsStore {
  private static instance: FirestoreContractsService;
  constructor(private readonly contractsCollection?: ContractCollectionLike) {}

  public static getInstance() {
    if (!this.instance) {
      this.instance = new FirestoreContractsService();
    }

    return this.instance;
  }

  private get collection() {
    return this.contractsCollection ?? FirebaseAdminService.getInstance().getFirestore().collection("contracts");
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
