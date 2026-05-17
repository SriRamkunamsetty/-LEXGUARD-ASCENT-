# LEXGUARD

LEXGUARD is an AI rights and contract intelligence platform built for legal and quasi-legal document review. It analyzes uploaded agreements, extracts risky clauses, explains real-world implications, scores risk, simulates scenarios, and produces negotiation-oriented recommendations through a real backend pipeline rather than frontend-only prompting.

## Chosen Vertical

The chosen vertical is `AI-powered legal intelligence` for contracts, policies, terms, and similar documents that users often accept without fully understanding the consequences.

The project focuses on:
- clause extraction
- semantic legal reasoning
- exploitative or ambiguous language detection
- explainable risk scoring
- OCR-assisted ingestion
- negotiation recommendations
- scenario simulation

This aligns directly with the hackathon problem statement around improving transparency, awareness, and informed decision-making for individuals and organizations reviewing legal documents.

## Problem Statement

Legal and quasi-legal documents are usually long, dense, and asymmetric. Users frequently agree to terms involving hidden liabilities, restrictive obligations, broad IP transfer, weak termination protections, one-sided arbitration, privacy overreach, or renewal traps without meaningful understanding.

LEXGUARD addresses that problem by providing a backend-driven legal intelligence workflow that:
- ingests uploaded documents
- extracts readable text through parsing and OCR fallback
- runs structured AI analysis
- returns explainable contract risk findings in real time
- stores lifecycle state and results in Firestore

## Approach And Logic

The solution is intentionally designed as a backend-owned cloud-native workflow instead of a thin frontend wrapper.

Core engineering approach:
- Firebase Auth authenticates the user.
- The backend verifies Firebase ID tokens through Firebase Admin.
- The backend owns the authoritative analysis lifecycle in Firestore.
- Uploaded files are validated and processed through a reusable analysis workflow service.
- Text extraction happens through PDF parsing or OCR fallback.
- Gemini / Vertex AI returns structured legal analysis with strict schemas.
- Results are streamed to the client over SSE and persisted server-side.

Design logic:
- keep trust boundaries on the backend
- centralize orchestration into reusable services
- make runtime behavior observable with request IDs and structured logs
- prepare the runtime for Cloud Run, ADC, Vertex AI, and Secret Manager
- progressively harden testing, accessibility, and operational maturity

## How The Solution Works

### 1. Authentication

- The frontend signs the user in with Firebase Auth.
- The client sends a Firebase ID token to the backend.
- The backend verifies the token with Firebase Admin before accepting analysis requests.

### 2. Upload And Validation

- The user uploads a supported file such as PDF, plain text, markdown, or supported image formats.
- Backend upload policy enforces file size and allowed types.
- Validation services check metadata and reject unsupported extensions or MIME types.

### 3. Analysis Workflow

- The backend creates a pending contract record in Firestore.
- The analysis workflow service orchestrates extraction, AI analysis, and persistence.
- Text is extracted via PDF parsing first.
- If text extraction is empty, OCR fallback uses Gemini image reasoning to recover document text.
- Prompt-sanitization logic treats the document as untrusted content and flags prompt-injection markers.
- Gemini / Vertex AI produces structured analysis including:
  - document type
  - overall risk score
  - confidence score
  - summary
  - negotiation recommendations
  - risky clauses
  - simulated scenarios

### 4. Streaming

- The backend streams status updates to the client over SSE.
- The client parses status, error, and completion events through a reusable analysis client service.
- The UI updates in real time as the workflow progresses.

### 5. Persistence

- Firestore stores the authoritative contract lifecycle:
  - `processing`
  - `completed`
  - `error`
- The client reads contract history from Firestore but no longer owns authoritative write transitions.

## Architecture

Current implemented architecture:
- `React + Vite` frontend
- `Express` backend
- `Firebase Auth` for authentication
- `Firestore` for persistence and lifecycle state
- `Firebase Admin` for backend verification
- `Gemini / Vertex AI` for structured legal analysis
- `SSE` for real-time status streaming
- `Docker + Cloud Run` deployment path

Important backend architecture principles:
- reusable service-oriented orchestration
- backend-owned trust boundaries
- centralized validation
- centralized retry logic
- centralized logging and observability helpers
- shared schemas for contract analysis payloads

Key services:
- `AnalysisWorkflowService`
- `ContractAnalysisService`
- `FirestoreContractsService`
- `RetryManager`
- `ObservabilityManager`
- `ValidationManager`
- `SseManager`

## Tech Stack

Frontend:
- React
- Vite
- TypeScript
- Tailwind CSS
- Firebase client SDK

Backend:
- Express
- TypeScript
- Multer
- Firebase Admin
- `@google/genai`
- Zod

Cloud / Platform:
- Google Cloud Run
- Vertex AI
- Firebase Auth
- Firestore
- Secret Manager
- Cloud Build
- Artifact Registry

## Cloud Deployment

Production target:
- Google Cloud Run on project `sita-486706`

Production posture:
- prefer Vertex AI with ADC instead of long-lived Gemini API keys
- use a service account scoped for Cloud Run execution
- use Secret Manager for fallback secret injection where required
- use Artifact Registry for container images
- use Cloud Build for builds

The deployment guide lives in [CLOUD_RUN_DEPLOYMENT.md](/D:/LEXGUARD/repo_src/CLOUD_RUN_DEPLOYMENT.md).

## Security

Security measures currently implemented:
- backend Firebase token verification
- backend-owned Firestore lifecycle writes
- secure headers
- request IDs and structured logging
- prompt-injection detection and prompt sanitization
- centralized upload validation
- Firestore rules that block client writes to authoritative contract records
- distributed-safe rate-limiting architecture backed by Firestore

Security hardening still in progress:
- deeper MIME sniffing
- stronger request schema enforcement
- richer audit taxonomy
- cost/tuning review for Firestore-backed rate limiting
- stronger malicious payload inspection hooks

## Testing

Current verification includes:
- pure-function runtime assertions
- prompt-guarding tests
- SSE formatting/parsing tests
- readiness/startup verification tests

There is also an HTTP integration test path prepared in `tests/http-integration.ts` for:
- health endpoint verification
- auth rejection behavior
- SSE completion flow

Current limitation:
- the local dependency install is damaged in this workspace, so HTTP integration execution is blocked until runtime dependencies such as `express` are repaired.

## Observability

Current observability direction:
- structured JSON logging
- request IDs
- analysis lifecycle logs
- timing instrumentation around Gemini calls and workflow execution
- readiness evaluation support

Still to harden:
- Cloud Monitoring metrics
- distributed tracing
- Firestore latency metrics
- OCR latency metrics
- richer retry metrics and cancellation telemetry

## Accessibility

Current accessibility posture:
- semantic landmarks
- skip navigation
- accessible live-region updates for streaming status
- ARIA labeling improvements

Still to harden:
- automated accessibility testing
- focus-management refinement
- broader keyboard-navigation validation

## Assumptions Made

- Cloud Run production will use Vertex AI through ADC and a scoped service account.
- Firestore is the authoritative runtime store for contract lifecycle state.
- Legal reasoning remains assistive and explainable, not legally binding advice.
- Documents are processed synchronously today, with staged async orchestration planned as the next major runtime-hardening step.
- The local workspace currently has partial dependency corruption, so some runtime checks are blocked until dependency repair succeeds.

## Repository Status

Current maturity:
- real backend
- real auth
- real Firestore lifecycle
- real SSE streaming
- real AI execution path
- production-oriented cloud design

Current hardening focus:
- integration testing
- startup verification
- async orchestration decoupling
- operational cloud maturity
- AI evaluation maturity
