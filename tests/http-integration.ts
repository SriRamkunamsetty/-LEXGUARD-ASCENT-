import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../src/server/app";
import { HealthService } from "../src/services/system/health.service";

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

async function main() {
  await run("health endpoint returns readiness payload with request id", async () => {
    const app = createApp({
      verifyIdToken: async () => ({ uid: "test-user" } as any),
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

  console.log("HTTP integration assertions passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
