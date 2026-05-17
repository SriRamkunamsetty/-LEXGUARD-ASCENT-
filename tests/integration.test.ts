import { describe, it, expect } from "vitest";
import http from "node:http";
import { createApp } from "../src/server/app";
import { HealthService } from "../src/services/system/health.service";
import { AnalysisWorkflowService } from "../src/services/analysis/analysis-workflow.service";
import { FirestoreRateLimitService } from "../src/services/firebase/firestore-rate-limit.service";
import type { ContractsStore } from "../src/services/firebase/firestore-contracts.service";

const allowAllRateLimitStore = {
  consume: async () => ({ allowed: true, remaining: 999 }),
};

function startTestServer(app: ReturnType<typeof createApp>) {
  return new Promise<{ server: http.Server; baseUrl: string }>((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to bind test server.");
      }
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

class InMemoryContractsStore implements ContractsStore {
  public readonly created: Array<Record<string, unknown>> = [];
  public readonly completed: Array<{ contractId: string; analysis: unknown }> = [];
  public readonly errored: Array<{ contractId: string; errorMessage: string }> = [];
  private nextId = 1;

  async createPendingRecord(input: { userId: string; originalName: string; fileSize: number; mimeType: string }) {
    const id = `contract-${this.nextId++}`;
    this.created.push({ id, ...input });
    return id;
  }

  async markCompleted(contractId: string, analysis: unknown) {
    this.completed.push({ contractId, analysis });
  }

  async markErrored(contractId: string, errorMessage: string) {
    this.errored.push({ contractId, errorMessage });
  }
}

class InMemoryDocumentCacheStore {
  private cache = new Map<string, unknown>();

  async checkCache(fileHash: string): Promise<unknown | null> {
    return this.cache.get(fileHash) || null;
  }

  async saveCache(fileHash: string, analysis: unknown): Promise<void> {
    this.cache.set(fileHash, analysis);
  }
}

function createDefaultApp(overrides?: Partial<Parameters<typeof createApp>[0]>) {
  return createApp({
    verifyIdToken: async () => ({ uid: "test-user" } as any),
    rateLimitStore: allowAllRateLimitStore,
    evaluateReadiness: () =>
      HealthService.evaluateReadiness({
        firebaseReady: true,
        vertexConfigured: true,
        firestoreWritable: true,
      }),
    runAnalysisWorkflow: async () => {
      throw new Error("not used");
    },
    ...overrides,
  });
}

describe("HTTP Integration Tests", () => {
  it("health endpoint returns readiness payload with request ID", async () => {
    const app = createDefaultApp();
    const { server, baseUrl } = await startTestServer(app);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("ok");
      expect(body.data.requestId).toBeTruthy();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("health endpoint includes security headers", async () => {
    const app = createDefaultApp();
    const { server, baseUrl } = await startTestServer(app);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("x-frame-options")).toBe("DENY");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(response.headers.get("content-security-policy")).toBeTruthy();
      expect(response.headers.get("x-request-id")).toBeTruthy();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("analyze endpoint rejects missing auth", async () => {
    const app = createDefaultApp();
    const { server, baseUrl } = await startTestServer(app);
    try {
      const formData = new FormData();
      formData.append("document", new Blob(["hello"], { type: "text/plain" }), "contract.txt");
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        body: formData,
      });
      expect(response.status).toBe(401);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("analyze endpoint streams status and complete events", async () => {
    const app = createDefaultApp({
      runAnalysisWorkflow: async (_input, onProgress) => {
        onProgress?.({ step: "INGESTION", message: "received" });
        onProgress?.({ step: "FINALIZING", message: "done" });
        return {
          contractId: "contract-123",
          parsedData: {
            documentType: "employment",
            overallRiskScore: 72,
            confidenceScore: 88,
            summary: "Summary",
            negotiationRecommendations: ["Negotiate liability cap"],
            clauses: [],
            scenarios: [],
          },
          injectionSignals: [],
          extractedTextLength: 120,
        };
      },
    });

    const { server, baseUrl } = await startTestServer(app);
    try {
      const formData = new FormData();
      formData.append("document", new Blob(["hello"], { type: "text/plain" }), "contract.txt");
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        body: formData,
        headers: { Authorization: "Bearer test-token" },
      });

      const text = await response.text();
      expect(response.status).toBe(200);
      expect(text).toContain("event: status");
      expect(text).toContain("event: complete");
      expect(text).toContain("contract-123");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("analyze endpoint returns 429 when rate limiter denies", async () => {
    const app = createDefaultApp({
      rateLimitStore: { consume: async () => ({ allowed: false, remaining: 0 }) },
    });

    const { server, baseUrl } = await startTestServer(app);
    try {
      const formData = new FormData();
      formData.append("document", new Blob(["hello"], { type: "text/plain" }), "contract.txt");
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        body: formData,
        headers: { Authorization: "Bearer test-token" },
      });
      const body = await response.json();
      expect(response.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RATE_LIMITED");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("rejects unsupported upload types with 415", async () => {
    const app = createDefaultApp();
    const { server, baseUrl } = await startTestServer(app);
    try {
      const formData = new FormData();
      formData.append("document", new Blob(["hello"], { type: "application/zip" }), "contract.zip");
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        body: formData,
        headers: { Authorization: "Bearer test-token" },
      });
      const body = await response.json();
      expect(response.status).toBe(415);
      expect(body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("Analysis Workflow Service", () => {
  it("marks contract completed after successful analysis", async () => {
    const store = new InMemoryContractsStore();
    const progressSteps: string[] = [];

    const result = await AnalysisWorkflowService.execute(
      {
        requestId: "req-1",
        userId: "user-1",
        file: { buffer: Buffer.from("test contract"), mimetype: "text/plain", originalname: "contract.txt", size: 13 },
      },
      (event) => progressSteps.push(event.step),
      {
        contractsStore: store,
        analyzeContract: async (_input, onProgress) => {
          onProgress?.({ step: "INGESTION", message: "received" });
          onProgress?.({ step: "FINALIZING", message: "finalized" });
          return {
            parsedData: {
              documentType: "employment",
              overallRiskScore: 25,
              confidenceScore: 92,
              summary: "Safe",
              negotiationRecommendations: ["Clarify notice period"],
              clauses: [],
              scenarios: [],
            },
            injectionSignals: [],
            extractedTextLength: 42,
          };
        },
        documentCacheStore: new InMemoryDocumentCacheStore() as any,
      },
    );

    expect(result.contractId).toBe("contract-1");
    expect(progressSteps).toEqual(["INGESTION", "FINALIZING"]);
    expect(store.created).toHaveLength(1);
    expect(store.completed).toHaveLength(1);
    expect(store.errored).toHaveLength(0);
  });

  it("marks contract errored when analysis fails", async () => {
    const store = new InMemoryContractsStore();

    await expect(
      AnalysisWorkflowService.execute(
        {
          requestId: "req-2",
          userId: "user-2",
          file: { buffer: Buffer.from("bad contract"), mimetype: "text/plain", originalname: "broken.txt", size: 12 },
        },
        undefined,
        {
          contractsStore: store,
          analyzeContract: async () => {
            throw new Error("Parser exploded");
          },
          documentCacheStore: new InMemoryDocumentCacheStore() as any,
        },
      ),
    ).rejects.toThrow(/Parser exploded/);

    expect(store.created).toHaveLength(1);
    expect(store.completed).toHaveLength(0);
    expect(store.errored).toHaveLength(1);
    expect(store.errored[0]?.errorMessage).toMatch(/Parser exploded/);
  });

  it("returns cached analysis if file hash matches", async () => {
    const store = new InMemoryContractsStore();
    const cache = new InMemoryDocumentCacheStore();
    const progressSteps: string[] = [];

    // Pre-populate cache
    const testBuffer = Buffer.from("test document");
    const testHash = require("crypto").createHash("sha256").update(testBuffer).digest("hex");
    await cache.saveCache(testHash, {
      overallRiskScore: 10,
      clauses: [{ title: "Cached Clause" }],
    });

    let analyzeCalled = false;
    const result = await AnalysisWorkflowService.execute(
      {
        requestId: "req-cache",
        userId: "user-cache",
        file: { buffer: testBuffer, mimetype: "text/plain", originalname: "doc.txt", size: 13 },
      },
      (event) => progressSteps.push(event.step),
      {
        contractsStore: store,
        analyzeContract: async () => {
          analyzeCalled = true;
          throw new Error("Should not be called");
        },
        documentCacheStore: cache as any,
      },
    );

    expect(analyzeCalled).toBe(false);
    expect(result.contractId).toBe("contract-1");
    expect((result.parsedData as any).overallRiskScore).toBe(10);
    expect(progressSteps).toEqual(["INGESTION", "FINALIZING"]);
    expect(store.completed).toHaveLength(1);
  });
});

describe("Firestore Rate Limit Service", () => {
  function createInMemoryFirestore() {
    const docs = new Map<string, { count: number; resetAt: number }>();
    return {
      collection() {
        return { doc(id: string) { return { id }; } };
      },
      async runTransaction<T>(
        updateFn: (tx: {
          get(ref: { id: string }): Promise<{ exists: boolean; data(): { count?: number; resetAt?: number } | undefined }>;
          set(ref: { id: string }, data: Record<string, unknown>, options?: { merge?: boolean }): void;
        }) => Promise<T>,
      ) {
        const tx = {
          async get(ref: { id: string }) {
            const data = docs.get(ref.id);
            return { exists: !!data, data: () => data };
          },
          set(ref: { id: string }, data: Record<string, unknown>, options?: { merge?: boolean }) {
            const current = docs.get(ref.id);
            const next = options?.merge && current ? { ...current, ...data } : data;
            docs.set(ref.id, { count: Number(next.count ?? 0), resetAt: Number(next.resetAt ?? 0) });
          },
        };
        return updateFn(tx);
      },
    };
  }

  it("blocks requests after configured limit", async () => {
    const firestore = createInMemoryFirestore();
    const limiter = new FirestoreRateLimitService(firestore as any);

    const first = await limiter.consume({ key: "test-user", limit: 2, windowMs: 60_000 });
    const second = await limiter.consume({ key: "test-user", limit: 2, windowMs: 60_000 });
    const third = await limiter.consume({ key: "test-user", limit: 2, windowMs: 60_000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });
});
