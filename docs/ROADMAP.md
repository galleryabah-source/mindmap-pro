# Product Roadmap

This roadmap converts the product brainstorm into a sequenced, testable delivery plan. Estimates are planning ranges, not delivery promises. Brainstorm items remain proposals until implemented and verified.

See [Brainstorm Backlog](BRAINSTORM_BACKLOG.md) for the full feature inventory, UX direction, template categories, engineering guardrails and P0–P4 prioritization. See [Product Strategy and Design System](PRODUCT_STRATEGY_AND_DESIGN_SYSTEM.md) for information architecture and visual standards. See [Multi-Platform Delivery Strategy](MULTI_PLATFORM_DELIVERY.md) for Android and Windows desktop packaging, architecture and release gates.

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
- Implement deterministic commands, undo/redo, autosave status, revision conflict handling and recoverable drafts. The backend contract and atomic save/restore gates are specified in [Canonical Graph Persistence Contract](CANONICAL_GRAPH_PERSISTENCE_CONTRACT.md).
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

## P2 — Phase 4: Document intelligence and AI Knowledge Studio (3–6 weeks)

- Secure upload and file validation, extraction preview and OCR strategy.
- Build source provenance, page references where available, proposed outline and accept/reject review.
- Add branch-scoped actions: explain, expand, summarize, compare, translate and generate questions.
- Add durable jobs, idempotency, quotas, cost telemetry, abuse controls and evaluation corpus.
- Preserve the rule: AI proposes changes; users review and accept them.

**Exit gate:** provenance, adversarial input, quota/cost, privacy and quality evaluations pass.

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

Repository/CI → identity and tenant model → graph invariants → editor/persistence → history and import/export → premium UX/templates → secure document/AI pipeline → collaboration/presentation → production hardening → shared cross-platform packages/API contracts → Android alpha → Windows desktop alpha → coordinated multi-platform release.


## UI/UX delivery track — Lightweight Premium Workspace

The approved detailed specification is [UI/UX and Front-End Architecture](UI_UX_FRONTEND_ARCHITECTURE.md). This track adds the design and front-end delivery gates without changing the canonical graph or persistence roadmap. The implementation contract for UI-02 is [UI-02 Application Shell Plan](UI_02_APPLICATION_SHELL_PLAN.md).

- **UI-01 — Design System Foundation:** semantic design tokens, light/dark themes, typography, spacing, focus/motion tokens and accessible shared components. Exit: component/contrast/visual baselines.
- **UI-02 — Application Shell:** responsive navigation, header, route boundaries, dashboard, account entry and capability-aware menus. Exit: route, responsive, accessibility and visual regression tests.
- **UI-03 — Mind Map Editor UX:** canvas-centered editor shell, toolbar, outline, inspector, responsive panels and explicit save/revision states. All mutations continue through the canonical graph command boundary. Exit: canonical integration, keyboard/touch and save-state tests.
- **UI-04 — Knowledge Surfaces:** document library, document-to-map review, AI assistant, knowledge and learning surfaces. Exit: provenance, review, permission, quota and module tests.
- **UI-05 — Premium UX:** pricing/plan presentation, usage and credits, upgrade/downgrade, billing history and payment states. Exit: server-enforced entitlement and billing integration tests; real payment activation remains separately gated.
- **UI-06 — Collaboration UX:** teams, shared workspace, invitations, roles, comments and activity. Exit: authorization, invitation/revocation and concurrency tests.
- **UI-07 — UX Quality Gate:** accessibility, performance, responsive, visual regression, E2E and operational-state review. Exit: measured evidence, not visual sign-off alone.

**Implementation priority:** UI-01 → UI-02 → UI-03. Define entitlement/billing contracts early, but do not collect real payments until backend verification, webhook idempotency, legal/provider review and support operations are complete.

**UI-02 execution status (1 November 2026):**
- UI-02A/B — PR #40: shell and truthful dashboard foundation. Exact-head CI previously passed; browser UAT remains outstanding.
- UI-02C — PR #41: authenticated workspace list/create and sign-in callback. Exact-head CI and target Supabase configuration remain pending verification.
- UI-02D — PR #42: server-verified account identity, sign-in entry, sign-out and responsive account menu. Exact-head CI and browser UAT remain required.
- These are stacked pull requests; merge in dependency order only after each exact-head quality gate passes. Do not deploy or activate account flows until Supabase Auth redirect configuration, database migration and RLS/RPC behavior are verified in the target environment.



## Backend persistence execution status — 17 November 2026

The backend persistence work is being delivered as a stacked, evidence-gated series of pull requests. These are implementation candidates until their exact-head CI, review and environment gates are accepted; an open PR is not a production release.

- **PR #45 — workspace identity guard:** database identity immutability guard and pgTAP assertion. Exact-head CI previously passed; hosted database validation remains outstanding.
- **PR #47 — SECURITY DEFINER hardening:** empty pinned search paths, schema-qualified built-ins, and restricted helper execution. Exact-head CI passed.
- **PR #48 — database CI:** isolated Supabase migration and pgTAP job. Exact-head CI passed, including database migration tests.
- **PR #49 — RPC-only graph write boundary:** direct client INSERT/UPDATE/DELETE revoked for maps, topics and cross-links; RLS-scoped reads remain. Exact-head CI passed.
- **PR #50 — graph persistence schema foundation:** edge metadata and private idempotency ledger, without enabling client writes. Exact-head CI passed.
- **PR #51 — atomic graph mutation RPCs:** create, save, restore, canonical graph validation, idempotency, immutable revisions and audit events. Exact-head CI passed, including migration, pgTAP behavior tests, lint, typecheck, unit tests, build and dependency audit. CI verifies the map row-lock and stale-revision contract; a true two-session race remains a mandatory dedicated-staging gate because the CI database test container cannot establish the required second authenticated session.

- **PR #52 — authenticated graph API:** server-only map list/read/create/save/restore and paginated revision-history routes; authenticated session checks, same-origin mutation protection, idempotency headers, bounded JSON, private no-store responses, API contract unit tests, and database/API parity validation for hierarchy/cross-link IDs. Exact-head CI passed on commit `8ade0238`; Vercel status for that exact commit remains pending.

**Current release blockers:** PR #52 exact-head Vercel confirmation and route integration tests; dedicated MindMap Pro Supabase project and authenticated tenant test users; real two-session concurrent save test; hosted migrations, RLS, Auth, backup/restore and Browser UAT. Direct graph table writes remain revoked. No hosted migration, PR merge, or production deployment is authorized by this status update.
