# Product Roadmap

This roadmap converts the product brainstorm into a sequenced, testable delivery plan. Estimates are planning ranges, not delivery promises. Brainstorm items remain proposals until implemented and verified.

See [PDF-to-MindMap Intelligence Engine Blueprint](PDF_TO_MINDMAP_INTELLIGENCE_BLUEPRINT.md) for the full document-ingestion architecture, user journey, contracts, security model and acceptance criteria. See [Brainstorm Backlog](BRAINSTORM_BACKLOG.md) for the full feature inventory, UX direction, template categories, engineering guardrails and P0–P4 prioritization. See [Product Strategy and Design System](PRODUCT_STRATEGY_AND_DESIGN_SYSTEM.md) for information architecture and visual standards. See [Multi-Platform Delivery Strategy](MULTI_PLATFORM_DELIVERY.md) for Android and Windows desktop packaging, architecture and release gates.

## P0 — Phase 0: Product and technical validation (1–2 weeks)

- Confirm MVP scope and user journeys; validate public reference-product capabilities without copying proprietary assets or code.
- Define graph invariants, hierarchy versus cross-link semantics, stable IDs and revision behavior.
- Prototype SVG versus Canvas rendering with realistic map sizes and keyboard navigation.
- Validate responsive interaction strategy for desktop, tablet, touch and mobile.
- Confirm GitHub CI, Cloudflare DNS/TLS/edge role, Supabase PostgreSQL role and compatible Node.js hosting.
- Define security boundaries, acceptance criteria, baseline performance measures and initial curated templates.

**Exit gate:** architecture decisions and acceptance criteria documented; risks and unknowns explicitly tracked.

## P0 — Phase 1: Repository and platform foundation (1–2 weeks)

- Bootstrap Next.js App Router, React and TypeScript; pin supported runtime/toolchain.
- Add CI for lint, typecheck, unit tests, build, dependency/security checks and migration validation.
- Add environment validation, health endpoint, structured logs and safe error handling.
- Create versioned PostgreSQL migrations, identity/session model, workspace membership and server-enforced tenant authorization.
- Establish secrets hygiene, backup expectations and local setup instructions.

**Exit gate:** deterministic setup, green CI, migration checks and tenant-isolation tests pass.

## P0 — Phase 2: Canonical graph and trustworthy editor (3–5 weeks)

- Implement map/topic/edge domain model with stable IDs and validated hierarchy/cross-links.
- Add create, edit, delete, move, reorder, nest, collapse/expand, pan/zoom and focused-branch navigation.
- Provide keyboard-accessible outline/tree editing as an alternative to canvas interaction.
- Implement deterministic commands, undo/redo, autosave status, revision conflict handling and recoverable drafts.
- Complete atomic map/root creation, audited revision writes, immutable identity boundaries and tested restore semantics before enabling cloud persistence.
- Implement JSON schema validation and import/export round-trip tests.
- Build the initial responsive editor shell with loading, empty, error, offline and permission-denied states.

**Exit gate:** reload and round-trip tests pass; no known data-loss defects; core keyboard and mobile workflows are usable.

## P1 — Phase 3: Premium UX and productivity (2–4 weeks)

- Introduce design tokens, polished light/dark themes, system preference, accessible focus and reduced-motion support.
- Build command palette, shortcuts, search, outline synchronization, labels, notes and links.
- Add version history and safe restore-as-new-revision.
- Add versioned template package schema, template preview, validation and duplicate-to-edit.
- Publish a small curated starter pack from the brainstorm categories; add custom templates after the package contract stabilizes.
- Add SVG/PNG/PDF export and visual regression coverage for editor, gallery, mobile and presentation-critical components.

**Exit gate:** core workflows meet accessibility criteria; export fixtures, template validation and visual regression checks pass.

## P2 — Phase 4: PDF-to-MindMap Document Intelligence (staged delivery)

This is a core knowledge-ingestion capability, not a parallel editor. The detailed product and technical contract is maintained in [PDF-to-MindMap Intelligence Engine Blueprint](PDF_TO_MINDMAP_INTELLIGENCE_BLUEPRINT.md).

- **D0 — Contracts:** versioned upload, extracted-document, source-provenance, structured-proposal, job-state and API contracts; threat model and evaluation corpus.
- **D1 — Ingestion:** authenticated PDF upload, signature/MIME validation, size/page/encryption limits, private object storage, content hash, tenant isolation and durable idempotent job creation.
- **D2 — Extraction:** page-aware PDF text/layout parser; detect text-native, scanned and mixed pages; OCR fallback adapter; preserve headings, numbering, lists, tables and page references.
- **D3 — Intelligence:** bounded chunking, schema-constrained extraction of topics, definitions, classifications, procedures, examples and semantic relations; distinguish source facts from interpretation; no external enrichment by default.
- **D4 — Hierarchical builder and graph compiler:** source-faithful hierarchy (six levels as default target, not a hard cap), canonical graph v2 compiler, graph validator and provenance/duplicate checks.
- **D5 — PDF Import Studio:** progress, proposed outline, map preview, source-page inspection, uncertainty warnings and accept/reject/selective-accept editing. No graph writes before explicit acceptance.
- **D6 — Atomic workspace commit:** create map, root, topics, cross-links, initial revision and audit event in one authorized transaction; idempotent commit and rollback tests.
- **D7 — Reliability/security:** retry/resume, cancellation, dead-letter handling, quotas, cost telemetry, retention/deletion, prompt-injection tests, privacy and load evaluation.
- **D8 — Learning actions:** explain, expand, summarize and generate questions from accepted branches using the same propose → review → accept discipline.

**Mandatory prerequisites:** canonical graph contract stable; PostgreSQL migration and tenant-isolation tests pass on a disposable database; atomic map creation and audited revision persistence exist; authenticated server persistence and private storage/queue adapters are ready. Do not bypass these prerequisites to ship a UI-only upload path.

**Exit gate:** source provenance and quality evaluation pass; compiler output passes canonical graph validation; preview/rejection performs no writes; accepted content commits atomically; idempotency, authorization, adversarial input, quota/cost, privacy, recovery and browser E2E suites pass.

## P3 — Phase 5: Sharing and collaboration (4–8 weeks)

- Add invitations, workspace roles, share links with expiry/revocation and viewer/editor distinctions.
- Add comments and collaboration presence where useful.
- Specify concurrent-editing consistency, conflict resolution, reconnect and offline semantics before implementation.
- Validate authorization and domain invariants on the server for every operation.

**Exit gate:** permission, concurrency, conflict and reconnect suites pass.

## P3 — Phase 6: Presentation and planning (2–4 weeks)

- Add presentation steps, focused branch, presenter notes, keyboard navigation and audience view.
- Add optional task fields, assignees, due dates and list/calendar views only after graph and persistence contracts are stable.
- Consider Gantt only after dependency and scheduling semantics are validated.

**Exit gate:** keyboard, timezone, permission and presentation-flow tests pass.

## P4 — Phase 7: SaaS operations (3–6 weeks; validate commercial need first)

- Add plans and server-enforced entitlements, usage metering and billing adapter only after product validation.
- Verify signed, idempotent webhooks, audit, retention and support runbooks.
- Avoid coupling the core graph model to a single billing provider.

**Exit gate:** entitlement, metering, webhook replay and audit tests pass.

## P4 — Phase 8: Production hardening (2–4 weeks)

- Load/performance and security reviews, dashboards, alerting and operational telemetry.
- Test backup restoration and recovery procedures; document migration and rollback/forward-fix strategy.
- Complete privacy/terms review, incident response, rollout and support plans.
- Measure performance on representative large maps and mobile devices; introduce heavier rendering technology only when benchmarks justify it.

**Exit gate:** release gates pass, restore drill succeeds, known risks have owners and production operations are documented.

## Cross-phase product rules

- One canonical graph model powers editor, templates, AI, presentation and collaboration.
- Imports follow validate → preview → commit; AI follows propose → review → accept.
- Never silently discard edits or let AI overwrite accepted content without explicit user action.
- All data access is authorized server-side; migrations are versioned and tested.
- Every feature includes acceptance criteria, unit/integration/E2E tests, responsive/accessibility states, telemetry, documentation and recovery considerations.
- Keep the main branch releasable and do not claim implementation or production readiness before evidence exists.

## Phase 9 — Android application

Start after the web MVP, API contracts and shared graph/domain packages are stable.

- Evaluate and validate a Capacitor-based Android shell on real devices.
- Reuse the canonical API, auth model, graph schema, validation rules and shared design tokens.
- Add native integrations only where needed: secure token storage, document picker/share sheet, file handling and network/lifecycle awareness.
- Test touch and keyboard interactions, large maps, save/reconnect, lifecycle changes, permissions and supported Android versions.
- Configure secure signing and CI artifacts; produce an APK for controlled distribution and/or AAB for Google Play.

**Exit gate:** reproducible signed build installs and upgrades on supported test devices; critical editor, auth, persistence, import/export and recovery tests pass.

## Phase 10 — Windows desktop application (.exe)

Start after shared API/domain contracts stabilize; can overlap with Android packaging if core quality gates remain green.

- Evaluate Tauri first for a lightweight Windows shell; consider Electron only if measured requirements justify it.
- Add native file open/save and drag-and-drop through a narrow adapter; other desktop features require product justification.
- Build a Windows installer, configure update/signing strategy, and test install, upgrade, rollback, uninstall and clean-user startup.
- Keep database and service-role secrets out of the client; use the same authenticated API and authorization model as web.
- Add Windows smoke tests and publish versioned artifacts with checksums and release notes.

**Exit gate:** reproducible installer passes installation/update/uninstall and smoke tests on supported Windows versions; signing and release procedure documented.

## Phase 11 — Cross-platform release and maintenance

- Maintain separate web, Android and Windows CI build/test lanes with shared domain, schema and API contract tests.
- Verify backward-compatible API evolution and minimum supported client versions.
- Document platform support policy, update cadence, crash/diagnostic privacy and end-of-support process.
- Test migration compatibility, backup recovery and cross-platform data consistency before public release.

**Exit gate:** all distributable artifacts are built, signed where applicable, installed and smoke-tested; no platform is described as released without evidence.

## Critical path

Repository/CI → identity and tenant model → graph invariants → atomic persistence/revisions/recovery → editor → history and import/export → premium UX/templates → PDF-to-MindMap document pipeline → collaboration/presentation → production hardening → shared cross-platform packages/API contracts → Android alpha → Windows desktop alpha → coordinated multi-platform release.
