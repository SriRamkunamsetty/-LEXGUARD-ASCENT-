export type ReadinessInput = {
  firebaseReady: boolean;
  vertexConfigured: boolean;
  firestoreWritable: boolean;
};

export type ReadinessStatus = "ok" | "degraded";

export type ReadinessReport = {
  status: ReadinessStatus;
  checks: {
    firebaseAuth: boolean;
    aiRuntime: boolean;
    firestore: boolean;
  };
};

export class HealthService {
  static evaluateReadiness(input: ReadinessInput): ReadinessReport {
    const checks = {
      firebaseAuth: input.firebaseReady,
      aiRuntime: input.vertexConfigured,
      firestore: input.firestoreWritable,
    };

    return {
      status: Object.values(checks).every(Boolean) ? "ok" : "degraded",
      checks,
    };
  }
}
