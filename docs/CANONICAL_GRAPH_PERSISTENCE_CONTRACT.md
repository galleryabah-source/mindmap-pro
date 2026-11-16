# Canonical Graph Persistence Contract

## Status

Implementation contract. PR #50 adds the edge-metadata and private idempotency schema foundation. PR #51 adds candidate atomic create/save/restore RPCs and isolated database behavior/concurrency tests. Exact-head CI is being revalidated after test-fixture corrections. This work does not enable cloud graph writes: the editor remains local-first until all RPC, authorization, revision, audit, API, hosted-environment and recovery gates below are independently verified.

## Non-negotiable invariants

1. One canonical graph document is the source of truth for editor, import/export, templates, revisions and future collaboration.
2. `parentId` is the hierarchy relation. `edges` contain cross-links only.
3. The stable root topic ID is `root`; it has no parent. Every other topic must resolve to that root.
4. React Flow is a rendering adapter. It is never the persistence contract.
5. A mutation is atomic: graph rows, map revision, immutable snapshot and audit event commit together or none commit.
6. Every mutation is authenticated, workspace-authorized, revision-checked and attributable to one actor.
7. No direct authenticated client INSERT/UPDATE/DELETE is allowed on `maps`, `topics` or `map_edges`. Mutations enter through audited RPCs only.
8. No automatic last-write-wins. A stale expected revision returns a conflict and preserves both server and local draft.

## Proposed RPC boundary

### `create_map(p_workspace_id, p_title, p_initial_graph, p_request_id)`

- Requires `auth.uid()`.
- Requires owner/admin/editor membership in the target workspace.
- Validates title, canonical graph version, root, node/edge limits, identifiers, parent references, coordinates, metadata size and cross-link endpoints.
- Creates map, initial topic/cross-link rows, revision 1 snapshot and `map.created` audit event in one transaction.
- Returns map ID, revision, schema version and request correlation ID.

### `save_map_snapshot(p_map_id, p_expected_revision, p_graph, p_note, p_request_id)`

- Locks the map row with `SELECT ... FOR UPDATE`.
- Verifies membership and editor-level role from the authenticated identity, never from client-supplied actor fields.
- Compares `p_expected_revision` to the current revision. A mismatch returns a stable conflict code and current revision; it never overwrites newer data.
- Validates the entire canonical document before changing rows.
- Replaces the map's topics and cross-links within the transaction, preserving stable IDs and all supported node/edge metadata.
- Increments the map revision exactly once.
- Inserts an immutable `map_revisions` snapshot and a `map.updated` audit event.
- Returns the committed revision and timestamp.
- Enforces request idempotency. Replaying the same request ID and payload returns the original result; reusing it with a different payload is rejected.

### `restore_map_revision(p_map_id, p_source_revision, p_expected_revision, p_request_id)`

- Requires editor-level access and an exact current revision.
- Loads a prior immutable snapshot and creates a new revision from it.
- Never rewinds or deletes revision history.
- Emits `map.revision_restored` with source and resulting revision references.

### Read contract

- Read queries are RLS-scoped to workspace membership.
- Responses return a complete canonical graph plus `revision`, `schemaVersion`, `updatedAt` and stable map identity.
- Do not expose internal table rows as the client domain model.

## Canonical-to-relational mapping

| Canonical graph field | Persistence |
|---|---|
| `version` | `maps.schema_version` and revision snapshot |
| `title` | `maps.title` |
| `nodes[].id` | `topics.id` scoped by `map_id` |
| `nodes[].parentId` | `topics.parent_id` |
| `nodes[].position.x/y` | `topics.position_x/position_y` |
| `nodes[].data.label` | `topics.title` |
| `nodes[].data.notes` | `topics.notes` |
| `nodes[].style` | `topics.style` |
| Other supported node data/type fields | `topics.metadata` |
| `edges[].id/source/target` | `map_edges.id/source_topic_id/target_topic_id` |
| `edges[].label/style` | `map_edges.label/style` |
| Other supported edge fields | `map_edges.metadata` (`jsonb` object) |
| Full canonical document | `map_revisions.snapshot` |

The full snapshot is the authoritative recovery and round-trip artifact. Relational columns support indexing, integrity and access patterns. `map_edges.metadata` stores supported edge fields that do not have dedicated relational columns; it must remain a JSON object and must be included in serialization. The migration `202611160001_graph_persistence_foundation.sql` adds this column without granting direct client write access. Serialization must be deterministic and tested against import/export fixtures.

The same migration adds `graph_mutation_requests`, a private idempotency ledger. Its unique `(actor_user_id, request_id)` key scopes retries to the authenticated actor. Each row records operation, canonical payload SHA-256, optional workspace/map references, response and completion timestamps. Resource references use `ON DELETE SET NULL` so deleting a map or workspace does not silently erase the request key and permit an old retry to create a duplicate. RLS is enabled and direct `anon`/`authenticated` privileges are revoked. The ledger is schema support only: no graph RPC currently consumes it, and it does not enable cloud persistence.

## Error contract

| Code | Meaning | Client behavior |
|---|---|---|
| `AUTH_REQUIRED` | No authenticated user | Request sign-in |
| `FORBIDDEN` | User is not an editor in the workspace | Show permission state; do not retry |
| `MAP_NOT_FOUND` | Map is unavailable in caller scope | Treat as unavailable without leaking cross-tenant existence |
| `REVISION_CONFLICT` | Expected revision is stale | Preserve local draft and offer reload/compare |
| `INVALID_GRAPH` | Canonical graph validation failed | Keep local draft; show actionable validation error |
| `REQUEST_ID_REUSED` | Same idempotency key used with different payload | Generate a new request ID only for a new user action |
| `PERSISTENCE_ERROR` | Unexpected transaction failure | Keep local draft; allow safe retry using same request ID |

## Required test matrix

- Anonymous caller cannot execute mutation RPCs.
- Viewer can read but cannot create, save or restore.
- Editor can mutate only maps in workspaces where they are a member.
- Cross-workspace map IDs cannot be read or mutated by another tenant.
- Root identity, missing parents, cycles, duplicate IDs, duplicate/reversed cross-links, self-links, out-of-range coordinates and oversized JSON are rejected.
- A failed mutation leaves topics, edges, map revision, revision snapshot and audit log unchanged.
- Two concurrent saves using the same expected revision yield exactly one success and one conflict.
- Retrying an identical request ID/payload does not create a second revision or audit event.
- Reusing a request ID with a different payload is rejected.
- Restoring an older revision creates a new revision and preserves the complete prior history.
- Snapshot serialization round-trips through canonical parser and React Flow adapter without semantic loss.
- Database backup/restore reproduces maps, revisions and audit correlation.

## Delivery sequence

1. Keep direct graph writes revoked (current hardening gate).
2. **Implemented in the isolated migration branch:** add edge metadata and a private idempotency ledger; verify schema and privilege boundaries with pgTAP.
3. Implement `create_map`, `save_map_snapshot` and `restore_map_revision` against the finalized schema; test authorization, idempotency, atomic rollback and concurrent revision conflicts in isolated local PostgreSQL.
4. Validate RPC behavior with pgTAP and a two-session concurrency test (same expected revision must yield one commit and one REVISION_CONFLICT); add typed server-only API wrappers only after the SQL contract is proven. Never call mutation RPCs from an untrusted browser path without server-side auth/session validation.
5. Add API contract tests and browser tests for conflict/recovery states.
6. Enable cloud persistence behind an explicit capability flag only after a dedicated Supabase project passes RLS, Auth, pgTAP, backup and restore gates.

## Explicitly out of scope for this milestone

- Realtime collaboration and presence.
- Last-write-wins or automatic conflict merging.
- Public share links.
- Direct browser writes to graph tables.
- Production database migration or production deployment.
