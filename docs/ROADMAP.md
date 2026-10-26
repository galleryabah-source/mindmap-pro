# Product Roadmap

This roadmap converts the product brainstorm into a sequenced, testable delivery plan. Estimates are planning ranges, not delivery promises. Brainstorm items remain proposals until implemented and verified.

See [Brainstorm Backlog](BRAINSTORM_BACKLOG.md) for the full feature inventory, UX direction, template categories, engineering guardrails and P0–P4 prioritization. See [Product Strategy and Design System](PRODUCT_STRATEGY_AND_DESIGN_SYSTEM.md) for information architecture and visual standards.

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

## Critical path

Repository/CI → identity and tenant model → graph invariants → editor/persistence → history and import/export → premium UX/templates → secure document/AI pipeline → collaboration/presentation → validated SaaS operations → production hardening.
