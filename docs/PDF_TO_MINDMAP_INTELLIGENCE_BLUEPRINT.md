# PDF-to-MindMap Intelligence Engine — Product Blueprint

**Status:** Proposed product capability; design and contract work only  
**Priority:** P1 strategic capability, implementation gated by canonical persistence and graph integrity  
**Product area:** MindMap-Pro Document Intelligence  
**Primary outcome:** Turn source documents into editable, traceable, native MindMap-Pro knowledge graphs without manual node-by-node authoring.

## 1. Product intent

Document Intelligence is a core knowledge-ingestion capability, not a separate mind-map editor. A user uploads a PDF (initial supported format), the system extracts and understands its contents, proposes a structured knowledge hierarchy, compiles that proposal into the existing canonical graph contract, and presents it for review before committing it to a workspace.

The engine must extract meaning rather than map pages mechanically. It should identify document structure, topics, subtopics, concepts, definitions, classifications, procedures, evidence, examples and relationships when supported by the source. It must preserve provenance so users can trace generated content back to source pages and sections.

The capability follows four stages:

- **Import:** securely ingest and validate a document.
- **Understand:** extract structure and interpret source content with bounded AI assistance.
- **Transform:** compile a validated proposal into the one canonical MindMap-Pro graph.
- **Learn:** reuse accepted graph content for explanations, summaries, questions and learning activities.

## 2. User journey and processing lifecycle

1. **Upload and validate.** Accept a PDF through an authenticated workspace action. Validate MIME/signature, file size, page count, encryption/password state, parser limits and malware-scanning policy. Calculate a content hash for deduplication and integrity. Store the original in private object storage using tenant-scoped access.
2. **Create a durable job.** Persist a job record with owner/workspace/document IDs, idempotency key, correlation ID, status, stage, attempt count, timestamps, limits and safe error classification. Enqueue work only after the upload record is committed.
3. **Extract document content.** Detect text-native versus scanned pages. Extract text, reading order, headings, paragraphs, lists, tables, captions and page coordinates where supported. Run OCR only on pages that need it. Preserve page boundaries and extraction method.
4. **Normalize and segment.** Normalize text without destroying legal numbering, headings, table relationships or page references. Segment by detected document structure and token/size budgets; retain stable chunk IDs and source spans.
5. **Understand and structure.** Produce schema-constrained proposals for document outline, concepts, definitions, classifications, steps, examples, evidence and semantic relations. Distinguish source-explicit facts from interpretation and optional external enrichment. External enrichment is off by default.
6. **Build hierarchy.** Construct a source-faithful tree. Six levels is a default depth target, not a hard cap: preserve the actual document's structure and allow deeper structures when justified. Do not force books, reports or regulations into a universal chapter/article pattern.
7. **Compile to canonical graph.** Map proposal nodes to canonical graph nodes and typed cross-links through a dedicated compiler. Use stable generated string IDs, validate all parent chains and cross-links, enforce graph limits, and preserve the existing document format/version contract. React Flow remains a renderer adapter, never the source of truth.
8. **Validate and review.** Run deterministic graph validation, source coverage checks, duplicate detection, unsupported-claim checks and quality warnings. Show a preview with source references, confidence/uncertainty and editable proposed branches. The user can accept all, accept selected branches, edit or reject.
9. **Commit atomically.** On explicit user acceptance, create the native map, root, topics, edges, initial revision and audit record in one authorized transaction. A failed commit must leave no partial map. Do not overwrite an existing map; merge is a separate future workflow with conflict preview.
10. **Learn and reuse.** Accepted maps can power branch explanations, summaries, question generation and study materials through separate AI commands that also follow propose → review → accept.

## 3. System components and boundaries

| Component | Responsibility | Required contract |
|---|---|---|
| PDF Ingestion API | Authenticated upload initiation, validation, quotas and document registration | Request/response schema, tenant authorization, idempotency |
| Private Document Storage | Original PDF and derived artifacts | Tenant-scoped object keys, signed expiring access, retention |
| PDF Parser | Text/layout/structure extraction | Page-aware normalized extraction result |
| OCR Adapter | Scanned-page text recognition | Replaceable provider, language/config metadata, page confidence |
| Document Normalizer | Reading order, headings, tables, lists and chunking | Deterministic normalized document schema |
| Document Intelligence Adapter | Semantic extraction and structured proposals | Versioned JSON schema, provider-neutral interface |
| Hierarchical Knowledge Builder | Source-grounded tree and semantic relation proposal | Hierarchy schema, provenance coverage |
| Canonical Graph Compiler | Proposal → canonical graph v2 | Existing graph contract; no alternate graph model |
| Graph Validator | Structural, semantic and source checks | Deterministic validation report |
| Preview/Review UI | Human review, selective acceptance and editing | Proposal is isolated from persisted map until accepted |
| Job Orchestrator | Durable stage execution, retry, cancellation and dead-letter | Idempotent state machine and bounded retry |
| Audit/Telemetry | Trace lifecycle and operational outcomes | Correlation IDs; no raw document content or secrets in logs |

All providers (OCR, AI, object storage and queue) sit behind narrow adapters. Domain and graph packages must not import vendor SDK types. Start with a modular monolith and worker process; do not introduce microservices without measured scale or isolation needs.

## 4. Canonical graph integration

There is exactly one canonical graph representation. Document Intelligence creates a proposal DTO; it does not persist a second graph schema or write directly to graph tables.

Pipeline:

`PDF → ExtractedDocument → StructuredKnowledgeProposal → ValidatedGraphProposal → CanonicalGraph v2 → Review → Atomic Workspace Commit`

- The compiler must target the existing `mindmap-pro` document format version 2 and graph version 1 until an explicit migration is designed.
- Keep canonical topic IDs and map-scoped persistence semantics unchanged; never coerce string IDs to UUIDs.
- Hierarchy is represented by `parentId`; cross-links are typed `cross_link` edges only.
- Source metadata must be JSON-safe, bounded and validated against the current node metadata contract. If the current contract cannot safely hold provenance, introduce a separately versioned source-reference record/extension rather than silently expanding the graph schema.
- Store original document bytes and large extraction payloads in object storage, not in graph node rows.
- The graph commit must use the same authorization, revision, audit and optimistic-concurrency service as manual editing.
- Import lifecycle is **validate → preview → explicit accept → atomic commit**. A preview is not a persisted map.

### Conceptual source provenance

The following is illustrative only; field names and storage location must be finalized in the versioned schema before implementation:

```json
{
  "source": {
    "documentId": "document-id",
    "pageStart": 12,
    "pageEnd": 14,
    "section": "Chapter II — Visa Types",
    "extractionMethod": "text",
    "confidence": 0.96
  }
}
```

Every extracted claim should retain one or more source spans where available. Page references must use the PDF's physical page index and, when detectable, the printed page label as separate values. Confidence is a signal for review, not a guarantee of truth.

## 5. Supported document behavior

Initial release targets PDF files:
- Text-native PDF.
- Scanned/image-only PDF using OCR.
- Mixed PDF with per-page extraction strategy.
- Headings, paragraphs, numbered clauses, lists, tables and captions where parser fidelity permits.

Document types include books, regulations, policies, reports, research papers, manuals and learning materials. Structure is inferred from the source; for example, regulations may contain chapters, articles, paragraphs and points, while a research paper may contain abstract, methods, results and references.

Out-of-scope for the first release: arbitrary websites, bulk office-file conversion, handwritten-document guarantees, automatic external fact enrichment, and unattended overwrite/merge into existing maps.

## 6. User experience — PDF Import Studio

The workspace flow should expose:

### Import scope
- Entire document.
- Selected chapter/section.
- Page range.
- Selected topic or extracted outline section.

### Generation controls
- Summary or detailed explanation.
- Include definitions, examples and procedures.
- Preserve original heading/numbering.
- Detect cross-section relationships.
- Target depth (six levels as default; allow source-appropriate deeper hierarchy).
- Language of output, with source language preserved as provenance.

### Review and refinement
- Proposed outline and mind-map preview.
- Expand/collapse branches and inspect source page/section.
- Accept all or selected branches.
- Edit, remove, split or combine proposed branches before commit.
- Warnings for OCR uncertainty, unsupported claims, low source coverage and possible duplicates.
- Clear progress stages and recoverable failure states.

### Post-acceptance actions
- Open as a native editable map.
- Explain/expand/summarize a selected branch.
- Generate questions or study notes from selected branches.
- Search concepts across the accepted document knowledge.
- Reopen source PDF at the referenced page when supported.

## 7. Reliability, security, privacy and cost controls

- Treat every PDF and extracted text as untrusted input. Prompt injection inside a document is content to analyze, never executable instruction.
- Validate file signature, not only extension or client MIME. Enforce file/page/decompression limits, parser timeouts and memory ceilings.
- Keep files private; use tenant-scoped storage keys and short-lived signed URLs. Never expose service-role credentials to clients.
- Protect upload and processing endpoints against IDOR, CSRF where relevant, SSRF through remote references, malware, zip/decompression bombs, parser exploits and resource exhaustion.
- Enforce workspace roles server-side before upload, read, review, commit, export or delete.
- Use idempotency keys at upload/job/commit boundaries. Retry transient failures only; validation, permission and unsupported-format failures are terminal.
- Maintain explicit states: `queued`, `validating`, `extracting`, `ocr`, `structuring`, `compiling`, `review_ready`, `committing`, `completed`, `failed`, `cancelled`.
- Persist stage checkpoints so retry resumes from the last safe completed stage.
- Add bounded retry, exponential backoff, dead-letter handling, cancellation and stale-job recovery.
- Set per-user/workspace file, page, token, time and cost quotas. Show estimated/actual usage where possible.
- Log document/job IDs, stage, duration, provider/model version, counts and safe error codes; do not log raw PDF text, secrets or sensitive extracted content.
- Define retention and deletion behavior for original PDFs, temporary extraction data, accepted maps, logs and backups.
- Provide evaluation sets across text-native, scanned, mixed-layout, tables, multi-column, multilingual and long documents.

## 8. Quality and acceptance criteria

A release candidate is acceptable only when all applicable checks pass:

1. Upload validation rejects invalid, oversized, encrypted/unsupported and malformed PDFs safely.
2. Text-native, scanned and mixed PDFs produce page-aware extraction results with extraction method recorded.
3. Structural extraction preserves detected headings, numbering, lists and table context within documented parser limits.
4. Every generated node/claim has source provenance or is explicitly marked as interpretation/derived content.
5. The engine never silently presents unsupported AI additions as source facts; uncertainty is visible in review.
6. The compiler emits a graph accepted by the current canonical validator, with one root, valid parent chains, no self-links, no invalid cycles and valid cross-links.
7. IDs remain canonical strings and all graph writes pass through the same persistence and authorization boundary as manual edits.
8. Preview/rejection causes no graph mutation; explicit acceptance commits map, root, topics, edges, revision and audit atomically.
9. Repeated job/commit requests with the same idempotency key do not create duplicate documents, maps or revisions.
10. Transient failures can resume safely; permanent failures do not retry indefinitely; cancellation and dead-letter behavior are tested.
11. Cross-workspace access is denied at API and database layers; signed links expire and cannot be reused beyond policy.
12. AI/OCR prompt-injection, malformed output, hallucination, duplication, quota and cost tests pass.
13. Performance and memory budgets are measured on representative document sizes; no production limits are claimed until benchmarked.
14. Browser E2E covers upload, progress, review, selective acceptance, cancel/retry, commit, source navigation and reopen/edit.
15. CI, migration tests, security review, backup/restore and observability gates pass before production enablement.

## 9. Delivery plan and dependency gates

This capability is planned as a strategic module after the canonical graph and persistence foundation. The roadmap phases below are sequential gates; implementation may be split into reviewable PRs.

| Stage | Scope | Exit evidence |
|---|---|---|
| D0 — Contracts | Document, extraction, proposal, provenance, job and API schemas | Versioned schemas, threat model and contract tests |
| D1 — Ingestion | Authenticated upload, private storage, metadata and quotas | Upload/API tests, tenant isolation, signature/limit tests |
| D2 — Extraction | PDF parser, page layout and OCR adapter | Golden corpus extraction tests and page provenance |
| D3 — Intelligence | Chunking, structured semantic extraction and hierarchical builder | Schema validation, source-grounding and quality evaluation |
| D4 — Graph compilation | Proposal compiler and canonical validator integration | Round-trip fixtures and graph invariant tests |
| D5 — Review Studio | Preview, source inspection, selective accept/reject and progress | Browser E2E; no writes before acceptance |
| D6 — Atomic commit | Map/root/topics/edges/revision/audit transaction | Rollback, idempotency, authorization and concurrency tests |
| D7 — Operations | Queue resilience, telemetry, quotas, cost, retention and security | Load, failure-injection, privacy and recovery evidence |
| D8 — Learning actions | Explain, expand, summarize and generate questions from accepted nodes | Scoped command tests and user-review workflow |

### Mandatory prerequisites

- Canonical graph contract and compiler boundary are stable.
- Database identity/tenant constraints and migrations are validated on a disposable PostgreSQL instance.
- Atomic map creation and audited revision persistence exist.
- Authenticated server persistence and workspace authorization pass.
- Job/storage adapter contracts and private object storage are available.
- CI is green on the exact implementation commit.

No PDF feature should bypass these gates by writing directly to client state or database tables.

## 10. Architecture decisions and open questions

- **Provider choice:** choose PDF parser, OCR and LLM providers only after a representative corpus benchmark, language coverage review, data-processing/privacy review and cost comparison.
- **OCR strategy:** prefer per-page OCR fallback instead of OCRing every page; store language, engine version and confidence.
- **Queue:** use a durable queue with retry and dead-letter semantics; exact implementation depends on hosting and operational constraints.
- **Provenance storage:** validate whether bounded source metadata belongs in canonical node metadata or a versioned source-reference table linked to map/revision/node.
- **Document versioning:** content hash identifies exact uploaded bytes; re-uploaded versions must not silently replace an earlier source.
- **AI evaluation:** maintain a curated benchmark corpus and human-reviewed expected outputs before choosing model/provider defaults.
- **Data residency and retention:** document user-facing policies and provider terms before sending any document content to third-party AI/OCR services.

## 11. Non-goals and guardrails

- This blueprint does not claim that PDF upload, OCR, AI extraction or cloud persistence already exists.
- No database migration, Supabase project link, deployment or production storage is authorized by this design document.
- Do not create a parallel graph schema, a second editor or a vendor-specific domain model.
- Do not silently overwrite maps or treat AI confidence as factual certainty.
- Do not force every document into a six-level tree; depth is source-dependent.
- Do not add a microservice fleet before operational need is demonstrated.

## 12. Product definition of success

A user can upload a PDF, receive a structured and editable mind map with clear explanations and traceable page references, inspect and correct the proposal, accept it into a workspace as a native MindMap-Pro map, and continue learning from it—without manually creating each node and without losing the source context.
