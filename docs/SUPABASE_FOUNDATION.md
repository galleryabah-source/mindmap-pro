# Supabase Foundation — MindMap Pro

## Scope
This milestone defines the initial canonical relational schema and SSR client setup. It does not link or mutate any existing Supabase project. The connected account currently contains other projects; only a dedicated MindMap Pro project may be linked after its identity and cost are verified.

## Schema
Migration `supabase/migrations/202610260001_initial_workspace_map_schema.sql` defines:
- `workspaces` and `workspace_members`
- `maps`, `topics` (canonical hierarchy via `parent_id`), and `map_edges` (cross-links only)
- Topic and cross-link IDs are text identifiers scoped by `map_id`, matching the canonical graph contract (`root`, `topic-...`, `link-...`); composite keys prevent collisions between maps
- A partial unique index prevents more than one root topic per map; an undirected unique index rejects reversed duplicate cross-links
- immutable-by-policy `map_revisions`
- restricted-read `audit_events`
- workspace membership/role helpers and authenticated `create_workspace` RPC
- RLS policies, query indexes and a cycle-prevention trigger that serializes parent changes per map

## Local configuration
Copy `.env.example` to `.env.local`, then fill in only the URL and publishable key from the dedicated MindMap Pro project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The code uses `@supabase/ssr` browser/server clients and a Next.js 16 `proxy.ts` session-refresh hook. If credentials are absent, the proxy leaves the current local editor usable; cloud features must not be enabled until the project has been verified and the migration tested.

## Security assumptions and limits
- All seven data tables enable Row Level Security.
- Workspace membership is checked in RLS, not only in the UI.
- `owner`, `admin`, `editor`, and `viewer` are distinct roles. Viewer mutations are not permitted by the RLS policies.
- The `create_workspace` RPC creates the workspace, owner membership and audit record in one transaction.
- Membership changes and revision writes are intentionally denied to direct client requests until audited server-side RPCs are implemented.
- Audit events have no direct client write policy. Audited write RPCs/triggers are still required for map/topic/edge mutations before production.
- The topic parent foreign key prevents cross-map parenting, and a per-map lock plus recursive trigger rejects parent cycles. This requires concurrent database tests before production.
- RLS policies and SECURITY DEFINER functions require validation against a dedicated project with authenticated test users before production use.
- Never put service-role keys or database credentials in `NEXT_PUBLIC_*` variables.
- Do not run this migration against unrelated existing projects such as `MTA DETENI` or `galleryabah`.

## Validation
A pgTAP starter suite lives at `supabase/tests/001_schema_security.test.sql`. It checks required tables, RLS enablement, security helpers, and direct-write restrictions for audit/revision tables. The suite and migration have not yet been run against a dedicated database.

## Apply checklist
1. Create/identify a dedicated Supabase project named MindMap Pro and verify its project ref and expected cost.
2. Install Supabase CLI and link the repository to that exact project only.
3. Run the migration and pgTAP tests in a disposable local/dedicated project first.
4. Test anonymous denial, workspace isolation, owner/admin/editor/viewer permissions, invalid cross-map foreign keys, revision immutability, cycle prevention under concurrent updates, and workspace creation rollback.
5. Generate TypeScript database types and commit them only after schema validation.
6. Run Supabase security/performance advisors and test backup/restore before production.

## Not yet implemented
The editor does not yet use Supabase Auth, server persistence, or collaborative sync. Drafts remain local until the authenticated API and save/recovery flow are implemented and tested.
