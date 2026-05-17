import { Worker } from "worker_threads";

export interface PDFParseResult {
  text: string;
  numpages: number;
}

/**
 * PDFParserService
 * 
 * Offloads CPU-intensive PDF parsing to an isolated Node.js Worker Thread.
 * This completely prevents event-loop blocking on Cloud Run during high load.
 */
export class PDFParserService {
  static async parse(buffer: Buffer): Promise<PDFParseResult> {
    return new Promise((resolve, reject) => {
      // Spawn a lightweight, self-contained worker using eval: true
      const workerCode = `
        const { parentPort, workerData } = require("worker_threads");
        
        async function run() {
          try {
            const pdfParseModule = require("pdf-parse");
            const parseFunc =
              typeof pdfParseModule === "function"
                ? pdfParseModule
                : pdfParseModule.default || pdfParseModule;

            if (typeof parseFunc !== "function") {
              throw new Error("Resolved pdf-parse is not a function");
            }

            const data = await parseFunc(Buffer.from(workerData));
            parentPort.postMessage({
              success: true,
              text: data.text || "",
              numpages: data.numpages || 0,
            });
          } catch (error) {
            parentPort.postMessage({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        run();
      `;

      const worker = new Worker(workerCode, {
        eval: true,
        workerData: buffer,
      });

      worker.on("message", (message: any) => {
        if (message.success) {
          resolve({
            text: message.text,
            numpages: message.numpages,
          });
        } else {
          reject(new Error(message.error || "Unknown worker error"));
        }
      });

      worker.on("error", (error) => {
        reject(new Error(`Worker execution exception: ${error.message}`));
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }
}
