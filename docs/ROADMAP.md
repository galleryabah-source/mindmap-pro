# Product Roadmap

Estimates are planning ranges, not delivery promises.

## Phase 0 — Product and technical validation (1–2 weeks)
Verify reference-product capabilities, finalize MVP scope, spike SVG vs Canvas, large-map rendering and keyboard navigation. Decide identity, data access, storage and deployment.
**Exit:** decisions and acceptance criteria documented.

## Phase 1 — Repository/platform foundation (1–2 weeks)
Next.js/TypeScript skeleton, CI, environment validation, PostgreSQL migrations, health endpoint, identity/session, workspace authorization and structured logs.
**Exit:** deterministic setup, green CI, tenant-isolation tests.

## Phase 2 — Canonical graph/editor MVP (3–5 weeks)
Map/topic/edge model, create/edit/delete/reorder/nest, collapse/expand, pan/zoom, keyboard alternatives, undo/redo, autosave, stale revision handling and JSON import/export.
**Exit:** no known data-loss defects; round-trip/reload tests pass.

## Phase 3 — Productivity (2–4 weeks)
Search, outline, themes, labels, notes, links, attachments, templates, revisions and SVG/PNG/PDF export.
**Exit:** accessibility and export fixtures pass.

## Phase 4 — Knowledge and AI (3–6 weeks)
Secure upload, extraction preview, OCR strategy, source-linked generation, job queue, quotas, cost telemetry and evaluation corpus.
**Exit:** provenance, adversarial and budget controls pass.

## Phase 5 — Sharing and collaboration (4–8 weeks)
Invitations, roles, share links, comments, presence, concurrent editing, conflict/reconnect behavior.
**Exit:** concurrency and permission suite passes.

## Phase 6 — Presentation and planning (2–4 weeks)
Presentation steps, focused branch, tasks, assignees, due dates and list/calendar views. Gantt only after dependencies/scheduling semantics are validated.
**Exit:** keyboard, timezone and role tests pass.

## Phase 7 — SaaS operations (3–6 weeks)
Plans, server-enforced entitlements, metering, billing adapter, signed/idempotent webhooks, audit, retention and support runbooks.
**Exit:** entitlement and webhook tests pass.

## Phase 8 — Production hardening (2–4 weeks)
Load/security review, dashboards/alerts, backup restore drill, privacy/terms review, incident response and rollout plan.
**Exit:** all release gates pass.

Critical path: repository/CI → identity/tenant model → graph invariants → editor/persistence → history/import-export → security → AI/collaboration → production hardening.
