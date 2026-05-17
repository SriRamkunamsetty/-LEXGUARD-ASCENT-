# LEXGUARD Engineering Audit

Date: 2026-05-17
Repository audited at: `D:\LEXGUARD\repo_src`
Problem statement source: `C:\Users\Moksha\Downloads\PROBLEM STATEMENT 01 Promptwars.pdf`

## Executive Summary

The shipped codebase is a functional React + Express prototype for contract analysis with Firebase-backed history and Gemini-driven reasoning. It demonstrates the core hackathon flow, but it is materially less mature than the architecture docs imply. The highest-risk blockers were secret exposure, lack of backend auth for analysis requests, and dependence on a revoked Gemini API key. Those items have been addressed in code by removing client secret injection, adding Firebase token verification for `/api/analyze`, centralizing Firebase configuration, and introducing a Cloud Run-safe Gemini auth strategy that supports Vertex AI with ADC.

## Current Architecture Overview

- Frontend: Vite + React 19 SPA with Firebase Auth and Firestore listeners.
- Backend: Express server embedded beside Vite, with SSE streaming for analysis progress.
- Document ingestion: `multer` memory uploads, `pdf-parse` for PDFs, raw text handling for text files, Gemini OCR fallback for images/scanned content.
- AI layer: `GeminiService` wrapper around `@google/genai`.
- Persistence: Firestore stores contract metadata and analysis results.
- Deployment: multi-stage Dockerfile targeting Cloud Run.

## Current Runtime Flow

1. User signs in with Firebase Auth.
2. Frontend creates a placeholder `contracts` document in Firestore.
3. Frontend uploads a file to `/api/analyze` and now sends a Firebase ID token in `Authorization: Bearer ...`.
4. Backend verifies the token with Firebase Admin.
5. Backend extracts text via `pdf-parse`, raw text decode, or OCR fallback.
6. Backend sends structured prompts to Gemini and streams progress/results back over SSE.
7. Frontend writes the completed analysis to Firestore and renders the results.

## Strengths

- The product already demonstrates clause extraction, risk scoring, scenario simulation, explainability, and real-time status updates that align well with the prompt.
- The core logic is separated into document, Firebase, and Gemini services rather than being entirely embedded in routes.
- Docker and Cloud Run deployment artifacts exist, which is valuable for the final round.

## Weaknesses and Risks

- Secret exposure:
  - `vite.config.ts` previously injected `process.env.GEMINI_API_KEY` into the client bundle.
  - `server.ts` and `FINAL_ENGINEERING_REPORT.md` logged or documented sensitive key details.
  - `CLOUD_RUN_DEPLOYMENT.md` included a real-looking Gemini key string.
- Backend auth:
  - `/api/analyze` previously trusted any caller and did not verify Firebase identity.
- Architecture drift:
  - `docs/LEXGUARD_ENTERPRISE_ARCHITECTURE.md` describes a Next.js/FastAPI/LangGraph/Postgres/Qdrant platform that is not present in the repository.
  - `backend-python/` contains only partial scaffolding and is not wired into the runtime.
- Cloud Run safety:
  - The app relied exclusively on a Gemini API key, which is fragile for production and vulnerable to rotation incidents.
  - No structured logging, request correlation, or explicit observability hooks exist yet.
- Testing:
  - Tests were ad hoc scripts rather than automated assertions. This patch adds executable Node tests, but coverage is still far below final-round expectations.
- Accessibility:
  - Sign-in and dashboard flows are visually polished but still lack explicit ARIA strategy, skip links, focus management, and formal accessibility checks.

## Bottlenecks

- Single-request in-memory uploads can become expensive under concurrency.
- PDF extraction and Gemini inference run inline on the request path, so long contracts tie up Cloud Run instances.
- Firestore writes are split between client and server-adjacent flows, which complicates consistency and auditability.

## Gemini Auth Root Cause

Primary root cause:
- A Gemini API key was committed or otherwise exposed publicly and revoked by Google, producing `403 PERMISSION_DENIED` with the leaked-key message.

Secondary root causes:
- The repo normalized API-key usage even for Cloud Run instead of preferring Vertex AI with ADC.
- The repo contained multiple secret-handling anti-patterns, increasing leak probability.

## Production-Grade Fix Strategy

- Local development:
  - Use `GEMINI_API_KEY` from local env only.
- Cloud Run production:
  - Prefer Vertex AI via `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION`.
  - Authenticate with the Cloud Run service account via ADC.
  - Keep Secret Manager for any fallback secrets, but avoid long-lived Gemini API keys when Vertex AI is available.
- Backend-only AI execution:
  - Never expose Gemini credentials to Vite or browser code.
  - Require Firebase ID token verification before analysis.

## Remaining Recommendations

- Move Firestore write ownership for analysis lifecycle fully to the backend.
- Add request-scoped structured logging and error taxonomy.
- Add integration tests for auth, uploads, SSE, and Firestore write behavior.
- Add Document AI or a dedicated OCR service for higher-fidelity scanned-document handling.
- Add rate limiting, MIME sniffing, and malware scanning before analysis for public deployment.
