# Product Requirements Document

## Objective
Build a web-first mind mapping and knowledge workspace for learners/researchers, educators/presenters, teams, project planners, and workspace administrators.

## Core journeys
1. Create workspace/map, edit topics, autosave, export/share.
2. Upload a PDF, preview extraction, generate a proposed map, verify source references, edit and accept.
3. Share with least-privilege access; comment/co-edit; revoke access.
4. Present ordered steps and focus a branch.
5. Restore an earlier revision without destroying history.

## Functional requirements
- Identity: authentication, multiple workspaces, membership, invitations, roles, session revocation, server-side authorization.
- Maps: create, rename, duplicate, archive, restore, delete; metadata and schema version.
- Topics: create/edit/delete/duplicate/move/reorder/indent/outdent; notes, links, labels, icons, colors and attachments.
- Graph: stable node IDs; parent-child hierarchy distinct from typed cross-links; prevent cycles.
- Canvas: pan/zoom/fit/center/minimap/focus; tree/radial/outline layouts; keyboard and touch support.
- History: undo/redo, explicit save state, recoverable autosave, immutable revisions, restore as a new revision.
- Import/export: versioned JSON, OPML, SVG/PNG/PDF and shareable HTML after fidelity testing; preview and validate imports.
- Collaboration: invitations, owner/editor/commenter/viewer roles, revocable/expiring links, comments, mentions, presence and conflict handling.
- Presentation: ordered steps, focused branch, presenter notes, keyboard navigation and read-only route.
- Tasks: status, assignee, due date, priority and checklist; defer Gantt until scheduling semantics are defined.
- AI: generate/expand/summarize/translate/suggest questions; generated content is a draft; retain source provenance; apply quota, timeout and cost controls.
- Templates: brainstorming, study notes, project plan, SWOT, decision tree and research synthesis.
- SaaS: server-enforced entitlements, idempotent signed billing webhooks, audit, retention and data export/delete workflows.

## Non-functional requirements
- Target WCAG 2.2 AA for core flows.
- Strong tenant isolation and least privilege.
- No silent loss of unsaved edits.
- Responsive desktop/tablet/mobile interaction.
- Instrument save failures, latency, queue depth, AI usage/cost, export duration and collaboration conflicts.
- Publish appropriate privacy, retention and data handling policies.

## MVP acceptance criteria
- Maps/topics survive reload.
- Domain/database rules prevent invalid tree relationships.
- Undo/redo is deterministic for supported commands.
- Save errors are visible and retryable; drafts remain recoverable.
- Cross-workspace reads and writes are denied.
- Invalid imports fail with actionable messages.
- CI checks lint, types, unit tests, migrations, core E2E, dependency and secret scans.
