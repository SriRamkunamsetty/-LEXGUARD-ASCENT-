import { Schema, Type } from "@google/genai";

export const clauseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, enum: ["HARMFUL", "AMBIGUOUS", "EXPLOITATIVE", "INFO", "COMPLIANCE"] },
    title: { type: Type.STRING },
    excerpt: { type: Type.STRING },
    explanation: { type: Type.STRING },
    recommendation: { type: Type.STRING },
    riskScore: { type: Type.INTEGER, description: "Risk score from 0 to 100 where 100 is critical risk." },
  },
  required: ["category", "title", "excerpt", "explanation", "recommendation", "riskScore"],
};

export const contractAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    documentType: { type: Type.STRING, description: "High-level agreement type such as employment, vendor, privacy policy, rental, or SaaS." },
    overallRiskScore: { type: Type.INTEGER, description: "Overall aggregate risk score from 0 to 100." },
    confidenceScore: { type: Type.INTEGER, description: "Confidence score from 0 to 100 based on document clarity and reasoning certainty." },
    summary: { type: Type.STRING, description: "Executive summary of the contract's risks and intent." },
    negotiationRecommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Actionable negotiation recommendations for the affected party.",
    },
    clauses: {
      type: Type.ARRAY,
      items: clauseSchema,
    },
    scenarios: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          probability: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
          impact: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["title", "probability", "impact", "description"],
      },
    },
  },
  required: [
    "documentType",
    "overallRiskScore",
    "confidenceScore",
    "summary",
    "negotiationRecommendations",
    "clauses",
    "scenarios",
  ],
};
