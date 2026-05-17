import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { Type, Schema } from "@google/genai";
import { ExtractionService } from "./src/services/document/extraction.service";
import { GeminiService } from "./src/services/ai/gemini.service";

// 1. Initialize Express and Middleware
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Utility to send SSE events
const sendSSE = (res: express.Response, type: string, data: any) => {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  // Use flush if compression middleware is added
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }
};

// 3. Define API Routes

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/analyze", upload.single("document"), async (req, res) => {
  // Set up Server-Sent Events headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const file = req.file;
    if (!file) {
      sendSSE(res, "error", { message: "No document provided" });
      res.end();
      return;
    }

    sendSSE(res, "status", { step: "INGESTION", message: `Received ${file.originalname}. Processing OCR/Text extraction...` });
    
    // Process context layer via robust extraction service
    let documentText = "";
    try {
      console.log("Calling ExtractionService");
      documentText = await ExtractionService.extractContext(file.buffer, file.mimetype);
      console.log("ExtractionService returned successfully");
    } catch (parseError: any) {
      console.error("Catching inside POST /api/analyze:", parseError);
      throw new Error(`Document Parsing Failed [DEBUG]: ${parseError.message}`);
    }

    if (!documentText || documentText.trim().length === 0) {
      throw new Error("Could not extract any text from the document.");
    }

    sendSSE(res, "status", { step: "AGENT_ORCHESTRATION", message: "Initiating multi-agent semantic analysis..." });
    
    // Define the schema for structured output to ensure enterprise-grade predictable parsing
    const clauseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, enum: ["HARMFUL", "AMBIGUOUS", "EXPLOITATIVE", "INFO", "COMPLIANCE"] },
        title: { type: Type.STRING },
        excerpt: { type: Type.STRING },
        explanation: { type: Type.STRING },
        recommendation: { type: Type.STRING },
        riskScore: { type: Type.INTEGER, description: "Risk score from 0 to 100 where 100 is critical risk." }
      },
      required: ["category", "title", "excerpt", "explanation", "recommendation", "riskScore"]
    };

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        overallRiskScore: { type: Type.INTEGER, description: "Overall aggregate risk score from 0 to 100." },
        summary: { type: Type.STRING, description: "Executive summary of the contract's risks and intent." },
        clauses: {
          type: Type.ARRAY,
          items: clauseSchema
        },
        scenarios: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              probability: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
              impact: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "probability", "impact", "description"]
          }
        }
      },
      required: ["overallRiskScore", "summary", "clauses", "scenarios"]
    };

    sendSSE(res, "status", { step: "AGENT_REASONING", message: "Legal Reasoning Engine evaluating clauses and mapping scenarios..." });

    // Execute Gemini API call strictly typing the output
    const prompt = `You are a Principal Legal AI Assessor. Analyze the following contract. Extract high-risk, ambiguous, or exploitative clauses. Provide an overall baseline summary, suggest scenario risks (like data breach, employment termination). Be extremely observant of indemnification, IP limits, non-competes, and auto-renewals.

CONTRACT TEXT:
${documentText.substring(0, 30000)} // Truncating safely if too massive
`;

    const parsedData = await GeminiService.getInstance().generateContentStructured(
      prompt,
      responseSchema,
      "gemini-2.5-pro",
    );
    
    sendSSE(res, "status", { step: "FINALIZING", message: "Parsing analysis array..." });
    
    // Complete payload
    sendSSE(res, "complete", { data: parsedData });
    res.end();

  } catch (error: any) {
    console.error("Analysis Error:", error);
    sendSSE(res, "error", { message: error.message || "Failed to process document" });
    res.end();
  }
});

// 4. Mount Vite Middleware for Dev/Prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite development middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LEXGUARD API server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
