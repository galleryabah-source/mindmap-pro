# Canonical Engine Contract

## Purpose

MindMap Pro uses one canonical graph model for editing, validation, import/export and local persistence. React Flow is the interactive rendering adapter; it is not the authoritative hierarchy model.

## Canonical document

Persisted documents use:

- `format: "mindmap-pro"`
- `version: 2`
- `graph.version: 1`
- `graph.title`
- `graph.nodes[]`, each with a stable `id`, `parentId`, `position` and `data`
- `graph.edges[]` for cross-links only; each edge has `type: "cross_link"`

The topic with ID `root` is mandatory and must have `parentId: null`. Every other topic must have exactly one valid parent chain leading to root. Cross-links never define hierarchy and never cause subtree cascade operations.

Topic and cross-link IDs are opaque strings scoped to a map, not UUIDs. Their IDs and owning `map_id` are immutable after insertion; map IDs and workspace ownership are also immutable through ordinary updates. This prevents silent identity changes and cross-tenant reassignment outside a future explicit audited transfer operation. The stable root ID is `root`; editor-generated IDs such as `topic-...` and `link-...` must be persisted without coercion. PostgreSQL therefore uses `(map_id, id)` composite keys for topics and cross-links. A database check requires the only parentless topic to use ID `root`, and a partial unique index permits at most one root topic per map; the application transaction must create the root before making the map available.

## Domain command boundary

All graph mutations should pass through validated domain commands:

- `addChildTopic`
- `updateTopicContent`
- `moveTopic`
- `reparentTopic`
- `deleteTopicSubtree`
- `addCrossLink`
- `deleteCrossLinks`

A command validates the incoming graph and the proposed mutation, then returns a new validated graph. UI components must not implement independent hierarchy rules. React Flow keyboard deletion is intercepted before mutation and routed through canonical delete commands; hierarchy edges cannot be detached as if they were cross-links.

## Adapter boundary

`toCanonicalGraph` converts React Flow nodes and visual edges into the canonical graph. Non-cross-link visual edges are hierarchy edges and must produce one rooted hierarchy. Cross-links are identified by `data.relation === "cross_link"`.

`fromCanonicalGraph` rebuilds hierarchy edges from `parentId` and renders cross-links separately. Cross-link labels and styles are preserved across adapter round trips.

## Document lifecycle and recovery

- Current persisted format is v2.
- Legacy v1 and versionless local drafts are validated before migration.
- Legacy free topics are attached to root during migration to preserve content.
- Ambiguous multiple-parent legacy structures are rejected rather than guessed.
- Local autosave writes the v2 key only after restore succeeds.
- If restore fails, the original draft key is retained, a recovery copy is created only when no prior recovery copy exists and verified by read-back, and autosave is disabled for that session.
- A validated import can resume autosave only when the failed draft has a verified recovery copy; otherwise autosave remains disabled to protect the original data.
- Local browser storage is not a cloud backup and does not synchronize between devices.

## History

The editor uses bounded transactional history. A pre-mutation snapshot is recorded once, the present snapshot is synchronized after state changes, and a new mutation invalidates the redo branch. The editor currently retains up to 30 undo snapshots.

## Validation limits

The canonical validator enforces the shared document limits in `lib/domain/map-document.ts`, including maximum title, topic, cross-link, identifier, label, notes and coordinate bounds. Nested metadata must be JSON-safe and bounded.

## Production gates

Do not claim production readiness until all applicable gates pass:

1. CI on the exact PR head: lint, typecheck, unit tests and production build.
2. Browser integration tests for compound editor actions, keyboard deletion, undo/redo and restore recovery.
3. Import/export round-trip and malformed-input regression tests.
4. Cloudflare build diagnosis based on actual build logs.
5. Authenticated server persistence, workspace authorization, revision writes, backup/restore and audit integration.
6. Accessibility, browser compatibility, performance and security review.

No database migration or cloud persistence is implied by this client-side canonical engine.
