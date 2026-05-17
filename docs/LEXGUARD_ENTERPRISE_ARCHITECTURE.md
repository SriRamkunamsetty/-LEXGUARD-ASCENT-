# LEXGUARD: Enterprise AI Rights & Contract Intelligence System
## Master Architecture & Engineering Blueprint

**Author:** Principal Software Architect / Senior AI Systems Engineer
**Target Deployment:** Google Cloud Platform (GCP)
**Primary Architecture Pattern:** Event-Driven, Microservices-Ready, Cloud-Native, API-First
**Core Stack:** Next.js 15, FastAPI, LangGraph, PostgreSQL, Redis, Qdrant, Google Cloud Run

---

## 1. Complete Cloud-Native System Architecture
LEXGUARD is designed as a decoupled, serverless-first, cloud-native application. 

*   **Client Tier:** Next.js 15 (App Router) served globally.
*   **API Gateway / Ingress:** Google Cloud Load Balancing + API Gateway (handles SSL, WAF, rate limiting).
*   **Backend Tier:** FastAPI async services running on Google Cloud Run (stateless, horizontally scalable).
*   **AI Orchestration Tier:** LangGraph-based multi-agent system running asynchronous long-polling or webhook-based tasks.
*   **Data Tier:** Cloud SQL (PostgreSQL) for relational state, Memorystore (Redis) for caching/queues, and Qdrant/Pinecone for vector embeddings.
*   **Storage Tier:** Google Cloud Storage (GCS) for secure, encrypted document storage.

**WHY:** This exact stack provides enterprise-grade scalability. Cloud Run scales from 0 to 1000s in seconds. Separating the frontend, API, and AI worker tiers ensures that heavy AI processing does not block standard API requests.

---

## 2. Google Cloud Architecture
*   **Compute:** Google Cloud Run (Frontend & Backend Containers).
*   **AI/ML Models:** Gemini API (via Vertex AI for enterprise data residency/compliance).
*   **Document Processing:** Google Document AI (Enterprise OCR & Layout Parsing).
*   **Security:** Secret Manager (Vault), Identity Platform / Firebase Auth.
*   **Observability:** Cloud Logging & Cloud Trace (distributed tracing across microservices).
*   **Storage:** Cloud Storage (GCS) configured with strict IAM and object lifecycle management.

**WHY:** Native GCP integration minimizes network latency, ensures IAM-based zero-trust security between services, and utilizes Google's world-class infrastructure for document OCR and LLM inference.

---

## 3. Cloud Run Deployment Strategy
*   **Containerization:** Multi-stage Dockerfiles. Only compiled code and necessary runtime dependencies are included in the final layer to minimize attack surface and cold start times.
*   **Execution Environment:** 2nd Gen execution environment for faster network performance and full Linux compatibility.
*   **Concurrency:** Configured to handle multiple concurrent requests per container for cost-efficiency.
*   **Traffic Splitting:** Canary deployments (e.g., 90% stable, 10% new revision) for zero-downtime updates and safe testing.

---

## 4. Firebase Integration Strategy
*   **Authentication:** Firebase Auth (Identity Platform). Users authenticate on the client; the Next.js frontend sends the JWT to FastAPI. FastAPI uses the `firebase-admin` SDK to verify the token via custom middleware.
*   **Role-Based Access Control (RBAC):** Firebase Custom Claims (e.g., `role: 'admin'`, `role: 'user'`) injected into the JWT.
*   **Analytics:** Firebase Analytics for tracking user behavior, drop-off rates on contract uploads, and UI interactions.

---

## 5. Frontend Architecture (Next.js 15)
### Design Patterns
*   **Server Components First:** Leverage React Server Components (RSC) to minimize Client JS bundle size. Only interactive elements (e.g., the Chat interface, upload forms) are Client Components.
*   **Shared UI Library:** `shadcn/ui` configured with Tailwind CSS for highly accessible, standardized enterprise UI.
*   **State Management:** React Query (TanStack) for server state caching and optimistic updates. Zustand for lightweight global client state.

### Structure
*   `src/app/` - Next.js routing, layouts, pages.
*   `src/components/` - Subdivided into `/ui`, `/layouts`, `/features`.
*   `src/hooks/` - Reusable custom hooks.
*   `src/lib/` - Reusable utilities (e.g., custom error parsing, formatting).
*   `src/services/` - API wrappers with axios/fetch, utilizing a Singleton pattern for API single source of truth.

---

## 6. Backend Architecture (FastAPI)
### Design Patterns
*   **Clean Architecture (Hexagonal):** Separation of Routes, Services, and Repositories.
*   **Dependency Injection (DI):** Heavily rely on FastAPI's `Depends()` to inject database sessions, AI clients, and configuration. This makes unit testing incredibly easy.
*   **Asynchronous Processing:** Endpoints are strictly `async def`. Heavy tasks (like contract analysis) use BackgroundTasks or a message broker (Redis + Celery/ARQ) and return a Job ID immediately (HTTP 202 Accepted).

### Structure
*   `app/api/` - HTTP routers and endpoint definitions.
*   `app/core/` - Configuration, security, JWT validation, custom exceptions.
*   `app/services/` - Business logic (e.g., `document_service.py`, `ai_orchestrator.py`).
*   `app/repositories/` - Database interaction layer using SQLAlchemy 2.0 (Async).
*   `app/schemas/` - Pydantic V2 models for input validation and output serialization.

---

## 7. AI Agent Architecture (LangGraph)
**Pattern:** Supervised Multi-Agent Workflow.
1.  **Ingestion Agent:** Validates OCR output, extracts metadata, determines document type (NDA, Employment, etc.).
2.  **Semantic Extractor Agent:** Uses RAG to chunk the document and pull out specific clauses.
3.  **Adversarial Review Agent:** Specifically prompted with an attacker/defense persona to find loopholes, hidden liabilities, and ambiguities.
4.  **Scoring & Synthesis Agent:** Aggregates findings, assigns a numerical Risk Score, creates plain-language explanations.

**Extensibility:** New agents (e.g., "Compliance Agent" for GDPR) can be added as nodes in the LangGraph without disrupting the existing pipeline.

---

## 8. Database Schema Design (PostgreSQL)
*   `Organizations` (Id, Name, Tier, Settings)
*   `Users` (Id, OrgId, FirebaseUid, Role, CreatedAt)
*   `Documents` (Id, UserId, Status, OriginalFileUrl, Hash, UploadedAt)
*   `Clauses` (Id, DocumentId, TextChunk, SemanticType, VectorId)
*   `Risks` (Id, ClauseId, SeverityLevel, Description, Remediation, AgentConfidence)
*   `AnalysisJobs` (Id, DocumentId, Status, StartedAt, CompletedAt)

---

## 9. Security Architecture
*   **Zero Trust:** All endpoints demand an authenticated JWT. No internal service explicitly trusts another without IAM.
*   **Input Sanitization:** Pydantic strictly validates all incoming JSON. Uploaded files are virus-scanned and checked against allowed MIME types before landing in GCS.
*   **Prompt Injection Defense:** Separate LLM inputs from instructions. Use structural delimiters (e.g., `"""`) and an initial light-weight evaluation LLM to check user input for adversarial AI prompts.
*   **At Rest & In Transit:** GCS buckets are encrypted at rest (Google Managed Keys). All traffic is enforced TLS 1.3.

---

## 10. Testing Architecture
*   **Unit Tests:** Pytest for FastAPI (mocking DB and LLM calls). Jest for Next.js unit tests. Target >85% coverage on core business logic.
*   **Integration Tests:** API tests hitting a test database instance to verify end-to-end flow without AI.
*   **AI Evaluation Testing:** A specialized suite using a Gold Standard dataset of contracts with known risks. A CI pipeline explicitly tests the AI workflow against this dataset using DeepEval to ensure regression DOES NOT happen to reasoning quality.
*   **Accessibility Testing:** `eslint-plugin-jsx-a11y` enforced in CI, plus automated Lighthouse CI runs.

---

## 11. Folder Structure (Monorepo setup)
```text
/lexguard-platform
│
├── /frontend                 # Next.js 15
│   ├── /src
│   │   ├── /app              # App Router
│   │   ├── /components       # Reusable UI
│   │   ├── /lib              # Utils
│   │   └── /hooks            # React Hooks
│   ├── package.json
│   └── tailwind.config.ts
│
├── /backend                  # FastAPI
│   ├── /app
│   │   ├── /api              # Routers/Endpoints
│   │   ├── /core             # Config & Exceptions
│   │   ├── /models           # SQLAlchemy Models
│   │   ├── /schemas          # Pydantic Schemas
│   │   ├── /services         # Business Logic
│   │   └── /agents           # LangGraph Orchestration
│   ├── requirements.txt
│   └── Dockerfile
│
├── /infrastructure           # Terraform / Google Cloud Setup
├── /scripts                  # CI/CD utilities
└── docker-compose.yml        # Local development orchestrator
```

---

## 12. CI/CD Pipeline (Cloud Build / GitHub Actions)
1.  **PR Opened:** Triggers Linting (Ruff/ESLint), Type Checking (MyPy/TypeScript), and Unit Tests.
2.  **Merge to `main`:** 
    *   Builds Docker containers.
    *   Pushes to Google Artifact Registry.
    *   Triggers AI Evaluation suite (subset of datasets).
3.  **Deployment:** Deploys automatically to Staging Cloud Run. Manual approval gate for Production deployment.

---

## 13. DevOps & Observability Strategy
*   **Logging:** All logs must be structured JSON. In Python, use `structlog`. This makes it searchable via Google Cloud Logging.
*   **Tracing:** Application instrumentation via OpenTelemetry to trace requests from the Next.js frontend all the way down to the specific Gemini API call.
*   **Error Tracking:** Centralized error monitoring (e.g., Sentry) mapping stack traces back to source code.

---

## 14. Reusable Coding Standards
*   **DRY & SOLID:** No duplicated query logic. Repository patterns manage all DB state. Services do not write SQL. Routers do not contain business logic.
*   **Custom Wrappers:** 
    *   `safe_llm_call`: A wrapper function for the Gemini API that includes automatic retry logic (Tenacity), timeout handling, fallback handling, and structured token tracking.
*   **Standardized Responses:** Every API response follows:
    `{ "success": boolean, "data": Any, "error": { "code": string, "message": string } }`

---

## 15. Centralized Error Handling Architecture
*   **Exception Hierarchy:** Base `LexGuardException` -> `AIProcessingError`, `DatabaseError`, `AuthenticationError`.
*   **Global Exception Handler:** FastAPI `@app.exception_handler(LexGuardException)` intercepts all custom errors and formats them into the standardized API response, logging the stack trace with context (User ID, Request ID) to Cloud Logging.

---

## 16. Future Extensibility Strategy
*   **Event-Driven Webhooks:** Analysis completion fires an internal event. Future modules (e.g., "Email Notification Service" or "Slack Integration") simply subscribe to this event without modifying core logic.
*   **Plugin AI Architecture:** LangGraph allows adding new reviewing agents (e.g., specific to Real Estate law or HIPAA compliance) simply by registering a new Node in the state graph. The core orchestrator remains untouched.
*   **API First:** Building a robust API layer ensures that if we decide to build a Mobile App or a VSCode Extension for lawyers later, it consumes the exact same validated endpoints as the Next.js app.
