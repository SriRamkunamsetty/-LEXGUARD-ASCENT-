import { z } from "zod";

export const analysisStatusSchema = z.enum(["processing", "completed", "error"]);

export const scenarioSchema = z.object({
  title: z.string(),
  probability: z.enum(["HIGH", "MEDIUM", "LOW"]),
  impact: z.string(),
  description: z.string(),
});

export const clauseSchema = z.object({
  category: z.enum(["HARMFUL", "AMBIGUOUS", "EXPLOITATIVE", "INFO", "COMPLIANCE"]),
  title: z.string(),
  excerpt: z.string(),
  explanation: z.string(),
  recommendation: z.string(),
  riskScore: z.number().int().min(0).max(100),
});

export const contractAnalysisSchema = z.object({
  documentType: z.string(),
  overallRiskScore: z.number().int().min(0).max(100),
  confidenceScore: z.number().int().min(0).max(100),
  summary: z.string(),
  negotiationRecommendations: z.array(z.string()),
  clauses: z.array(clauseSchema),
  scenarios: z.array(scenarioSchema),
});

export const contractRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  originalName: z.string(),
  status: analysisStatusSchema,
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string(),
  uploadDate: z.unknown().optional(),
  completedAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
  errorMessage: z.string().optional(),
  analysis: contractAnalysisSchema.optional(),
});

export type AnalysisStatus = z.infer<typeof analysisStatusSchema>;
export type ContractAnalysis = z.infer<typeof contractAnalysisSchema>;
export type ContractRecord = z.infer<typeof contractRecordSchema>;
export type ClauseResult = z.infer<typeof clauseSchema>;
export type ScenarioSimulation = z.infer<typeof scenarioSchema>;
