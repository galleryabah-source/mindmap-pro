begin;

create extension if not exists pgtap with schema extensions;
select plan(29);

select has_table('public', 'workspaces', 'workspaces table exists');
select has_table('public', 'workspace_members', 'workspace_members table exists');
select has_table('public', 'maps', 'maps table exists');
select has_table('public', 'topics', 'topics table exists');
select has_table('public', 'map_edges', 'map_edges table exists');
select has_table('public', 'map_revisions', 'map_revisions table exists');
select has_table('public', 'audit_events', 'audit_events table exists');

select ok((select relrowsecurity from pg_class where oid = 'public.workspaces'::regclass), 'RLS enabled on workspaces');
select ok((select relrowsecurity from pg_class where oid = 'public.workspace_members'::regclass), 'RLS enabled on workspace_members');
select ok((select relrowsecurity from pg_class where oid = 'public.maps'::regclass), 'RLS enabled on maps');
select ok((select relrowsecurity from pg_class where oid = 'public.topics'::regclass), 'RLS enabled on topics');
select ok((select relrowsecurity from pg_class where oid = 'public.map_edges'::regclass), 'RLS enabled on map_edges');
select ok((select relrowsecurity from pg_class where oid = 'public.map_revisions'::regclass), 'RLS enabled on map_revisions');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass), 'RLS enabled on audit_events');

select has_function('public', 'is_workspace_member', array['uuid'], 'workspace membership helper exists');
select has_function('public', 'has_workspace_role', array['uuid', 'text[]'], 'workspace role helper exists');
select has_function('public', 'create_workspace', array['text', 'text'], 'atomic workspace creation RPC exists');
select has_trigger('public', 'topics', 'topics_prevent_parent_cycle', 'topic hierarchy cycle guard exists');

select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'INSERT'), 'authenticated role cannot directly change membership');
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'INSERT'), 'authenticated role cannot directly insert audit events');
select ok(not has_table_privilege('authenticated', 'public.map_revisions', 'UPDATE'), 'authenticated role cannot update revisions');
select ok(not has_table_privilege('authenticated', 'public.map_revisions', 'DELETE'), 'authenticated role cannot delete revisions');

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_events'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ),
  'audit events have no client write policies'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'map_revisions'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ),
  'map revisions have no direct client write policies'
);

select ok(
  (select prosecdef and coalesce(array_to_string(proconfig, ','), '') like '%search_path=%'
   from pg_proc where oid = 'public.is_workspace_member(uuid)'::regprocedure),
  'membership helper is SECURITY DEFINER with explicit search_path'
);

select ok(
  (select prosecdef and coalesce(array_to_string(proconfig, ','), '') like '%search_path=%'
   from pg_proc where oid = 'public.has_workspace_role(uuid,text[])'::regprocedure),
  'role helper is SECURITY DEFINER with explicit search_path'
);

select ok(
  (select prosecdef and coalesce(array_to_string(proconfig, ','), '') like '%search_path=%'
   from pg_proc where oid = 'public.create_workspace(text,text)'::regprocedure),
  'workspace creation RPC is SECURITY DEFINER with explicit search_path'
);

select ok(
  not has_table_privilege('anon', 'public.maps', 'SELECT')
  and not has_table_privilege('anon', 'public.maps', 'INSERT')
  and not has_table_privilege('anon', 'public.maps', 'UPDATE')
  and not has_table_privilege('anon', 'public.maps', 'DELETE'),
  'anonymous role has no direct map table privileges'
);

select ok(
  not has_table_privilege('anon', 'public.workspaces', 'SELECT')
  and not has_table_privilege('anon', 'public.workspace_members', 'SELECT'),
  'anonymous role cannot read workspace metadata or membership'
);

select * from finish();
rollback;
