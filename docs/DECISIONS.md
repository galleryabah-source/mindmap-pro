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


## ADR-008 — Initial platform providers: GitHub, Cloudflare and Supabase
**Status:** Accepted as initial baseline; provider details remain configuration-driven.

- GitHub is the source of truth for code, reviews, issues and CI/CD workflow definitions.
- Cloudflare provides DNS, TLS/edge proxy and applicable security/rate-limiting controls. Private or authenticated data is not cached by default.
- Supabase provides managed PostgreSQL; Auth and Storage may be enabled when useful, behind application-owned boundaries.
- The Next.js app is deployed to a compatible Node.js runtime. Cloudflare Workers are not assumed to be a drop-in runtime for the Node.js app.
- Secrets are stored in deployment secret management and never committed.
- Schema migrations, authorization, backups, restore drills and tenant-isolation tests remain repository-controlled release gates.
- Revisit this ADR if measured constraints, contracts, pricing or technology changes justify a change. Provider abstractions must permit replacement without rewriting domain logic.
