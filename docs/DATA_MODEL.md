# PostgreSQL Data Model

## Core entities
users; workspaces; workspace_members; maps; topics; map_edges; map_revisions; optional map_events; comments; share_links; files; imports; exports; ai_jobs; tasks; audit_events; subscriptions; entitlements; idempotency_keys.

## Invariants
1. A map belongs to one workspace; every topic belongs to one map.
2. A parent topic must belong to the same map.
3. Cycles and self-parenting are forbidden.
4. Sibling ordering is deterministic.
5. Cross-link endpoints belong to the same map unless cross-map links are explicitly designed.
6. Every mutation checks permission before access/change.
7. Revisions are immutable; restore creates a new revision.
8. Share tokens are hashed, revocable and optionally expiring.
9. AI output remains a draft until accepted by an authorized user.

## Database guidance
- UUID primary keys and deliberate foreign-key delete behavior.
- Use timestamptz; store timestamps in UTC.
- Unique membership key: (workspace_id, user_id).
- Index topics by (map_id, parent_id, sort_key).
- Use transactions for multi-row tree moves and revision creation.
- PostgreSQL RLS may be defense in depth, not a replacement for application authorization.
- Use JSONB only for genuinely flexible metadata; keep queried fields typed.
- Benchmark adjacency lists/recursive CTEs before adopting closure tables/materialized paths.

## SQL sketch
```sql
CREATE TABLE maps (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  current_revision_id uuid,
  schema_version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE topics (
  id uuid PRIMARY KEY,
  map_id uuid NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  parent_id uuid,
  sort_key numeric NOT NULL,
  title text NOT NULL DEFAULT '',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, map_id),
  FOREIGN KEY (parent_id, map_id) REFERENCES topics(id, map_id)
    DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX topics_map_parent_order_idx ON topics (map_id, parent_id, sort_key);
```
The composite FK ensures a parent belongs to the same map, but does not prevent cycles. Enforce cycle prevention transactionally in the domain layer or with a reviewed trigger. Production migrations require review and migration tests.
