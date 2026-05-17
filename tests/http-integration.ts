import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../src/server/app";
import { HealthService } from "../src/services/system/health.service";
import { AnalysisWorkflowService } from "../src/services/analysis/analysis-workflow.service";
import { FirestoreRateLimitService } from "../src/services/firebase/firestore-rate-limit.service";
import type { ContractsStore } from "../src/services/firebase/firestore-contracts.service";

async function run(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function startTestServer(app: ReturnType<typeof createApp>) {
  return new Promise<{ server: http.Server; baseUrl: string }>((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to bind test server.");
      }

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

class InMemoryContractsStore implements ContractsStore {
  public readonly created: Array<Record<string, unknown>> = [];
  public readonly completed: Array<{ contractId: string; analysis: unknown }> = [];
  public readonly errored: Array<{ contractId: string; errorMessage: string }> = [];
  private nextId = 1;

  async createPendingRecord(input: {
    userId: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
  }) {
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

const allowAllRateLimitStore = {
  consume: async () => ({ allowed: true, remaining: 999 }),
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

function createInMemoryFirestore() {
  const docs = new Map<string, RateLimitRecord>();

  return {
    collection() {
      return {
        doc(id: string) {
          return { id };
        },
      };
    },
    async runTransaction<T>(
      updateFn: (tx: {
        get(ref: { id: string }): Promise<{ exists: boolean; data(): RateLimitRecord | undefined }>;
        set(ref: { id: string }, data: Record<string, unknown>, options?: { merge?: boolean }): void;
      }) => Promise<T>,
    ) {
      const tx = {
        async get(ref: { id: string }) {
          const data = docs.get(ref.id);
          return {
            exists: !!data,
            data: () => data,
          };
        },
        set(ref: { id: string }, data: Record<string, unknown>, options?: { merge?: boolean }) {
          const current = docs.get(ref.id);
          const next = options?.merge && current ? { ...current, ...data } : data;
          docs.set(ref.id, {
            count: Number(next.count ?? 0),
            resetAt: Number(next.resetAt ?? 0),
          });
        },
      };

      return updateFn(tx);
    },
  };
}

async function main() {
  await run("health endpoint returns readiness payload with request id", async () => {
    const app = createApp({
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
    });

    const { server, baseUrl } = await startTestServer(app);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.status, "ok");
      assert.ok(body.data.requestId);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await run("analyze endpoint rejects missing auth", async () => {
    const app = createApp({
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
    });

    const { server, baseUrl } = await startTestServer(app);
    try {
      const formData = new FormData();
      formData.append("document", new Blob(["hello"], { type: "text/plain" }), "contract.txt");
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      assert.equal(response.status, 401);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await run("analyze endpoint streams status and complete events", async () => {
    const app = createApp({
      verifyIdToken: async () => ({ uid: "test-user" } as any),
      rateLimitStore: allowAllRateLimitStore,
      evaluateReadiness: () =>
        HealthService.evaluateReadiness({
          firebaseReady: true,
          vertexConfigured: true,
          firestoreWritable: true,
        }),
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
        headers: {
          Authorization: "Bearer test-token",
        },
      });

      const text = await response.text();
      assert.equal(response.status, 200);
      assert.match(text, /event: status/);
      assert.match(text, /event: complete/);
      assert.match(text, /contract-123/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await run("analyze endpoint returns 429 when distributed limiter denies request", async () => {
    const app = createApp({
      verifyIdToken: async () => ({ uid: "test-user" } as any),
      rateLimitStore: {
        consume: async () => ({ allowed: false, remaining: 0 }),
      },
      evaluateReadiness: () =>
        HealthService.evaluateReadiness({
          firebaseReady: true,
          vertexConfigured: true,
          firestoreWritable: true,
        }),
      runAnalysisWorkflow: async () => {
        throw new Error("not used");
      },
    });

    const { server, baseUrl } = await startTestServer(app);
    try {
      const formData = new FormData();
      formData.append("document", new Blob(["hello"], { type: "text/plain" }), "contract.txt");
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: "Bearer test-token",
        },
      });
      const body = await response.json();

      assert.equal(response.status, 429);
      assert.equal(body.success, false);
      assert.equal(body.error.code, "RATE_LIMITED");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await run("analyze endpoint rejects unsupported upload types with API error JSON", async () => {
    const app = createApp({
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
    });

    const { server, baseUrl } = await startTestServer(app);
    try {
      const formData = new FormData();
      formData.append("document", new Blob(["hello"], { type: "application/zip" }), "contract.zip");
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: "Bearer test-token",
        },
      });
      const body = await response.json();

      assert.equal(response.status, 415);
      assert.equal(body.success, false);
      assert.equal(body.error.code, "UNSUPPORTED_FILE_TYPE");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await run("analysis workflow marks contract completed after successful analysis", async () => {
    const store = new InMemoryContractsStore();
    const progressSteps: string[] = [];

    const result = await AnalysisWorkflowService.execute(
      {
        requestId: "req-1",
        userId: "user-1",
        file: {
          buffer: Buffer.from("test contract"),
          mimetype: "text/plain",
          originalname: "contract.txt",
          size: 13,
        },
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
      },
    );

    assert.equal(result.contractId, "contract-1");
    assert.deepEqual(progressSteps, ["INGESTION", "FINALIZING"]);
    assert.equal(store.created.length, 1);
    assert.equal(store.completed.length, 1);
    assert.equal(store.errored.length, 0);
  });

  await run("analysis workflow marks contract errored when analysis fails", async () => {
    const store = new InMemoryContractsStore();

    await assert.rejects(
      () =>
        AnalysisWorkflowService.execute(
          {
            requestId: "req-2",
            userId: "user-2",
            file: {
              buffer: Buffer.from("bad contract"),
              mimetype: "text/plain",
              originalname: "broken.txt",
              size: 12,
            },
          },
          undefined,
          {
            contractsStore: store,
            analyzeContract: async () => {
              throw new Error("Parser exploded");
            },
          },
        ),
      /Parser exploded/,
    );

    assert.equal(store.created.length, 1);
    assert.equal(store.completed.length, 0);
    assert.equal(store.errored.length, 1);
    assert.match(store.errored[0]?.errorMessage || "", /Parser exploded/);
  });

  await run("FirestoreRateLimitService blocks requests after the configured limit", async () => {
    const firestore = createInMemoryFirestore();
    const limiter = new FirestoreRateLimitService(firestore as any);

    const first = await limiter.consume({
      key: "analyze:test-user",
      limit: 2,
      windowMs: 60_000,
    });
    const second = await limiter.consume({
      key: "analyze:test-user",
      limit: 2,
      windowMs: 60_000,
    });
    const third = await limiter.consume({
      key: "analyze:test-user",
      limit: 2,
      windowMs: 60_000,
    });

    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);
    assert.equal(third.remaining, 0);
  });

  console.log("HTTP integration assertions passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
