import { AppError } from "../../server/error-manager";
import { ObservabilityManager } from "../../server/observability-manager";
import { ContractAnalysisService } from "./contract-analysis.service";
import { FirestoreContractsService, type ContractsStore } from "../firebase/firestore-contracts.service";
import { DocumentCacheService } from "../firebase/firestore-cache.service";
import { ContractAnalysis } from "@/shared/contracts";

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

type AnalyzeDependency = typeof ContractAnalysisService.analyze;

export class AnalysisWorkflowService {
  static async execute(
    input: WorkflowInput,
    onProgress?: (event: { step: "INGESTION" | "AGENT_ORCHESTRATION" | "AGENT_REASONING" | "FINALIZING"; message: string }) => void,
    dependencies?: {
      contractsStore?: ContractsStore;
      analyzeContract?: AnalyzeDependency;
      documentCacheStore?: typeof DocumentCacheService.prototype;
    },
  ): Promise<WorkflowOutput> {
    const contractsStore = dependencies?.contractsStore ?? FirestoreContractsService.getInstance();
    const analyzeContract = dependencies?.analyzeContract ?? ContractAnalysisService.analyze;
    const documentCacheStore = dependencies?.documentCacheStore ?? DocumentCacheService.getInstance();
    const timer = ObservabilityManager.startTimer("analysis.workflow", {
      requestId: input.requestId,
      userId: input.userId,
      mimeType: input.file.mimetype,
      fileSize: input.file.size,
    });

    let contractId: string | null = null;

    try {
      contractId = await contractsStore.createPendingRecord({
        userId: input.userId,
        originalName: input.file.originalname,
        fileSize: input.file.size,
        mimeType: input.file.mimetype,
      });

      const fileHash = DocumentCacheService.generateHash(input.file.buffer);
      const cachedAnalysis = await documentCacheStore.checkCache(fileHash);

      if (cachedAnalysis) {
        onProgress?.({ step: "INGESTION", message: "Cache hit: Document analysis retrieved from global cache." });
        onProgress?.({ step: "FINALIZING", message: "Finalizing contract analysis record..." });
        
        await contractsStore.markCompleted(contractId, cachedAnalysis);
        timer.done("success", {
          contractId,
          clauseCount: cachedAnalysis.clauses?.length,
          riskScore: cachedAnalysis.overallRiskScore,
          cacheHit: true,
        });

        return {
          contractId,
          parsedData: cachedAnalysis,
          injectionSignals: [],
          extractedTextLength: 0,
        };
      }

      const result = await analyzeContract(
        {
          buffer: input.file.buffer,
          mimeType: input.file.mimetype,
          originalName: input.file.originalname,
        },
        onProgress,
      );

      await documentCacheStore.saveCache(fileHash, result.parsedData as ContractAnalysis);
      await contractsStore.markCompleted(contractId, result.parsedData);
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
        await contractsStore.markErrored(
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
