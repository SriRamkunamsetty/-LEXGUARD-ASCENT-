import { AppError } from "../../server/error-manager";
import { ObservabilityManager } from "../../server/observability-manager";
import { ContractAnalysisService } from "./contract-analysis.service";
import { FirestoreContractsService } from "../firebase/firestore-contracts.service";

type WorkflowInput = {
  requestId?: string;
  userId: string;
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  };
};

type WorkflowOutput = {
  contractId: string;
  parsedData: unknown;
  injectionSignals: string[];
  extractedTextLength: number;
};

export class AnalysisWorkflowService {
  static async execute(
    input: WorkflowInput,
    onProgress?: (event: { step: "INGESTION" | "AGENT_ORCHESTRATION" | "AGENT_REASONING" | "FINALIZING"; message: string }) => void,
  ): Promise<WorkflowOutput> {
    const timer = ObservabilityManager.startTimer("analysis.workflow", {
      requestId: input.requestId,
      userId: input.userId,
      mimeType: input.file.mimetype,
      fileSize: input.file.size,
    });

    let contractId: string | null = null;

    try {
      contractId = await FirestoreContractsService.getInstance().createPendingRecord({
        userId: input.userId,
        originalName: input.file.originalname,
        fileSize: input.file.size,
        mimeType: input.file.mimetype,
      });

      const result = await ContractAnalysisService.analyze(
        {
          buffer: input.file.buffer,
          mimeType: input.file.mimetype,
          originalName: input.file.originalname,
        },
        onProgress,
      );

      await FirestoreContractsService.getInstance().markCompleted(contractId, result.parsedData);
      timer.done("success", {
        contractId,
        clauseCount: (result.parsedData as any)?.clauses?.length,
        riskScore: (result.parsedData as any)?.overallRiskScore,
      });

      return {
        contractId,
        ...result,
      };
    } catch (error) {
      if (contractId) {
        await FirestoreContractsService.getInstance().markErrored(
          contractId,
          error instanceof Error ? error.message : "Failed to process document",
        );
      }

      timer.done("failure", {
        contractId,
        message: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        error instanceof Error ? error.message : "Failed to process document",
        "ANALYSIS_WORKFLOW_FAILED",
        500,
      );
    }
  }
}
