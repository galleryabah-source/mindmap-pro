# Canonical Persistence Write Contract

## Status

**Design contract only — not implemented.** This document defines the only permitted future mutation boundary for cloud-backed MindMap Pro maps. It does not authorize a migration, RPC deployment, direct client writes, or activation of cloud persistence.

## Non-negotiable architecture

- One application, one canonical graph lifecycle, one source of truth.
- The canonical domain graph and its command validator remain authoritative. React Flow is a renderer/interaction adapter, not a persistence model.
- Every feature (manual editor, import, PDF Intelligence, AI expansion, templates, learning tools) submits a validated canonical document through the same persistence service.
- Browser clients never write directly to `maps`, `topics`, `map_edges`, `map_revisions`, `audit_events`, or membership tables.
- A successful mutation is one PostgreSQL transaction that commits graph rows, map revision, immutable snapshot, audit event, and idempotency result together.
- No success response may be emitted before the transaction commits.

## Canonical document boundary

The server accepts only the current canonical document envelope:

- `format = "mindmap-pro"`
- `version = 2`
- `graph.version = 1`
- exactly one root topic with `id = "root"` and `parentId = null`
- every other topic has exactly one parent chain ending at root
- cross-links are typed `cross_link` edges and reference existing topics
- no duplicate topic IDs, edge IDs, or undirected cross-link endpoint pairs
- metadata is JSON-safe and within the shared domain limits

The server must run the same canonical parser/validator and domain invariants as the editor. Database constraints are a second line of defense, not a replacement for domain validation.

## Proposed mutation operations

### 1. Create map with initial graph

Conceptual server operation:

```ts
createMapWithGraph({
  workspaceId: string;
  title: string;
  description?: string;
  requestId: string;        // UUID generated once per user intent
  document: CanonicalMapDocument;
}): Promise<{
  mapId: string;
  revision: 1;
  snapshotId: string;
  requestId: string;
}>
```

The transaction must:
1. Resolve the actor from the authenticated server session; never trust a client-supplied actor ID.
2. Verify workspace membership and role (owner/admin/editor).
3. Validate the complete canonical document and all size limits.
4. Claim the idempotency key and reject reuse with a different payload fingerprint.
5. Insert map, root, topics, and cross-links.
6. Insert immutable revision 1 with the complete canonical snapshot.
7. Insert the audit event with actor, workspace, map, request ID, action, and safe metadata.
8. Persist the idempotent response and commit.

A map must never become visible without its root and initial revision.

### 2. Commit graph revision

Conceptual server operation:

```ts
commitMapGraph({
  mapId: string;
  expectedRevision: number;
  requestId: string;        // stable across retries of this intent
  document: CanonicalMapDocument;
  note?: string;
}): Promise<{
  mapId: string;
  revision: number;
  snapshotId: string;
  requestId: string;
}>
```

The transaction must:
1. Resolve the authenticated actor and map workspace.
2. Lock the map row with `SELECT ... FOR UPDATE`.
3. Check workspace role and reject viewers.
4. Check the idempotency ledger before evaluating the expected revision. A retry of an already committed request must return the original result.
5. Compare `expectedRevision` with the locked current revision; reject stale writes without changing any row.
6. Validate the complete canonical document server-side.
7. Replace or reconcile the graph rows without allowing cross-map references, missing parents, cycles, duplicate cross-links, or root loss.
8. Increment the revision exactly once.
9. Insert the immutable full snapshot and audit event.
10. Store the request fingerprint and response, then commit.

Concurrent edits to one map serialize at the map row. Two writes based on the same revision cannot both succeed as the next revision.

## Idempotency contract

A dedicated write-request ledger is required before these operations can ship. Proposed fields:

- `workspace_id`
- `actor_user_id`
- `request_id`
- `map_id` (nullable for map creation)
- `payload_hash` (server-calculated from a canonical serialization)
- `result_revision`
- `response` (bounded JSON)
- `created_at`

Required uniqueness: `(workspace_id, actor_user_id, request_id)`.

Rules:
- Same actor, workspace, request ID, and payload hash: return the original committed response.
- Same request ID with a different payload hash: reject as an idempotency conflict.
- A failed transaction leaves no ledger row.
- Client retries reuse the same request ID; a new user intent gets a new ID.
- Retention and cleanup must not remove keys while a retry can still be valid.

## Revision and audit guarantees

- Revision numbers are monotonically increasing per map.
- Each revision stores a complete, validated canonical document snapshot, not a partial patch.
- Revisions are append-only; clients cannot update or delete them.
- Every successful map creation or graph commit has exactly one corresponding audit event.
- Failed authorization, validation, stale revision, or transaction attempts create no successful revision.
- Audit records identify actor, workspace, map, request ID, action, timestamp, and bounded non-sensitive details.
- Never place document contents, secrets, access tokens, or unnecessary personal data in audit details.

## Authorization boundary

- Identity comes from the verified server session and `auth.uid()`, not request JSON.
- Owner/admin/editor may create or mutate maps according to workspace policy; viewer is read-only.
- The server must verify map-to-workspace ownership inside the same transaction.
- Service-role credentials, if ever required, remain server-only and are never exposed through `NEXT_PUBLIC_*`.
- Direct table DML remains revoked for browser roles. Do not restore it to make a feature work.
- SECURITY DEFINER functions must set an empty or tightly controlled `search_path`, fully qualify object references, revoke PUBLIC execution, and grant execution only to the intended authenticated role.

## Error semantics

| Condition | Contract result | Mutation |
|---|---|---|
| Missing/invalid session | Unauthorized | None |
| Not a workspace member | Forbidden/not found (non-disclosing) | None |
| Viewer attempts write | Forbidden | None |
| Invalid canonical graph | Validation error | None |
| Stale expected revision | Conflict with current revision | None |
| Same request ID, different payload | Idempotency conflict | None |
| Same request ID, same payload | Original committed response | No second write |
| Database/worker failure | Retryable server error | Full rollback |

API responses must use stable machine-readable error codes. Do not expose raw SQL errors, stack traces, or cross-tenant existence information.

## Required database structures (future migration)

The implementation will likely require:
- an idempotency/write-request ledger with a unique scoped request key;
- a single audited map-create operation;
- a single atomic graph-commit operation;
- immutable revision and audit write paths;
- explicit constraints and indexes supporting the canonical graph contract.

Exact table/function names and SQL signatures must be finalized against the repository's TypeScript domain types before writing a migration. Do not create a speculative schema that drifts from the canonical graph contract.

## Acceptance gates

1. Disposable PostgreSQL migration applies cleanly from an empty database.
2. pgTAP verifies grants, RLS, root identity, same-map parent/link constraints, immutable identities, and write RPC privileges.
3. Integration tests cover create map/root/revision/audit atomicity and rollback at every injected failure point.
4. Authorization tests cover anonymous, non-member, viewer, editor, admin, and owner.
5. Concurrency tests prove one of two same-base revision writes conflicts and no revision is skipped or duplicated.
6. Idempotency tests prove exact replay returns the same response and payload mismatch is rejected.
7. Graph tests cover deep hierarchy, missing parent, cycle, cross-map link, duplicate undirected link, root deletion, and malformed metadata.
8. E2E verifies create → edit → save → reload → restore, including network retry and stale-tab conflict.
9. Backup/restore reproduces maps and revision history; audit records remain consistent.
10. Cloud persistence stays disabled until every required gate passes.

## Explicit non-goals

- No direct browser writes to canonical tables.
- No separate persistence implementation for PDF/AI/template modules.
- No silent last-write-wins behavior.
- No partial graph commits.
- No automatic merging of conflicting graph revisions in the first release.
- No live Supabase project mutation as part of this design document.
