begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

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

select ok(not has_table_privilege('authenticated', 'public.audit_events', 'INSERT'), 'authenticated role cannot directly insert audit events');
select ok(not has_table_privilege('authenticated', 'public.map_revisions', 'UPDATE'), 'authenticated role cannot update revisions');
select ok(not has_table_privilege('authenticated', 'public.map_revisions', 'DELETE'), 'authenticated role cannot delete revisions');

select * from finish();
rollback;
