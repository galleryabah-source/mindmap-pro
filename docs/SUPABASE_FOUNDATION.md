# Supabase Foundation — MindMap Pro

## Scope
This milestone defines the first canonical relational schema and access-control baseline. It does not link or mutate any existing Supabase project. The Supabase account currently has other projects; only a dedicated MindMap Pro project may be linked after the owner confirms its identity.

## Schema
Migration `supabase/migrations/202610260001_initial_workspace_map_schema.sql` defines:
- `workspaces` and `workspace_members`
- `maps`, `topics`, and `map_edges`
- immutable-by-policy `map_revisions`
- restricted-read `audit_events`
- workspace membership/role helpers and an authenticated `create_workspace` RPC
- RLS policies and query-oriented indexes

## Security assumptions and limits
- All data tables enable Row Level Security.
- Workspace membership is checked server-side in RLS, not only in the UI.
- `owner`, `admin`, `editor`, and `viewer` are distinct roles. Viewer mutations are not permitted by the RLS policies.
- The authenticated `create_workspace` RPC creates the workspace, owner membership and audit record atomically.
- Audit events have no direct client write policy. Additional audited write RPCs/triggers are required for map/topic/edge mutations before production.
- The composite topic parent foreign key prevents cross-map parenting and direct self-parenting. It does not, by itself, prevent longer parent cycles; cycle detection must be implemented transactionally before tree reparenting is enabled.
- RLS policies and SECURITY DEFINER functions require validation against a dedicated project with real authenticated users before production use.
- Do not place service-role keys or database credentials in `NEXT_PUBLIC_*` variables.
- Do not run this migration against the unrelated existing `MTA DETENI` or `galleryabah` projects.

## Apply and validate
1. Create/identify a dedicated Supabase project named MindMap Pro and verify its project ref.
2. Install Supabase CLI and link the repository to that exact project.
3. Review the migration; run it in a disposable dedicated project first.
4. Test anonymous denial, workspace isolation, owner/admin/editor/viewer permissions, invalid cross-map foreign keys, revision immutability, and workspace creation rollback.
5. Generate TypeScript database types and commit them only after schema validation.
6. Run Supabase security/performance advisors and test backup/restore before production.

## Not yet implemented
The Next.js app does not yet use Supabase Auth, server-side session handling, server persistence, or collaborative sync. Local browser drafts remain local until the authenticated server data layer is implemented and tested.
