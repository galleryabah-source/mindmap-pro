# Architecture Decision Records

## ADR-001 — Modular monolith first
**Status:** Proposed. Start with a modular Next.js application; extract workers/services only when measurements justify it. This limits operational complexity while preserving boundaries.

## ADR-002 — PostgreSQL is canonical
**Status:** Proposed. PostgreSQL owns maps, topics, edges, revisions, permissions and audit; object storage owns binary files and large artifacts.

## ADR-003 — Stable topic IDs and explicit edges
**Status:** Proposed. UUID identity is independent of labels and coordinates. Hierarchy is distinct from cross-links.

## ADR-004 — AI output is a draft
**Status:** Proposed. Generated content is validated and reviewed before accepted changes are persisted.

## ADR-005 — Snapshot revisions initially
**Status:** Proposed. Start with immutable snapshots; consider event-plus-snapshot history only after benchmarking.

## ADR-006 — Original implementation
**Status:** Accepted. Use reference products to understand capability expectations, but create original code, branding, design tokens and assets.

## ADR-007 — Verify current feature entitlements
**Status:** Proposed. Do not state assumed plan limits as facts until verified against current official documentation.
