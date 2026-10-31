begin;

create extension if not exists pgtap with schema extensions;
select plan(57);

select has_table('public', 'workspaces', 'workspaces table exists');
select has_table('public', 'workspace_members', 'workspace_members table exists');
select has_table('public', 'maps', 'maps table exists');
select has_table('public', 'topics', 'topics table exists');
select has_table('public', 'map_edges', 'map_edges table exists');
select has_table('public', 'map_revisions', 'map_revisions table exists');
select has_table('public', 'audit_events', 'audit_events table exists');

select col_type('public', 'topics', 'id', 'text', 'topic IDs preserve canonical string identifiers');
select col_type('public', 'map_edges', 'id', 'text', 'cross-link IDs preserve canonical string identifiers');
select has_index('public', 'topics', 'topics_one_root_per_map_idx', 'each map is limited to one root topic');
select has_check('public', 'topics', 'topics_root_identity', 'root topic identity matches canonical graph contract');
select has_index('public', 'map_edges', 'map_edges_unique_undirected_idx', 'reversed duplicate cross-links are rejected');

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
select ok((select prosecdef from pg_proc where oid = 'public.is_workspace_member(uuid)'::regprocedure), 'membership helper runs with SECURITY DEFINER');
select ok((select prosecdef from pg_proc where oid = 'public.has_workspace_role(uuid, text[])'::regprocedure), 'role helper runs with SECURITY DEFINER');
select ok(not has_function_privilege('anon', 'public.is_workspace_member(uuid)', 'EXECUTE'), 'anonymous role cannot execute membership helper');
select ok(not has_function_privilege('anon', 'public.has_workspace_role(uuid, text[])', 'EXECUTE'), 'anonymous role cannot execute role helper');
select ok(has_function_privilege('authenticated', 'public.is_workspace_member(uuid)', 'EXECUTE'), 'authenticated role can execute membership helper');
select ok(has_function_privilege('authenticated', 'public.has_workspace_role(uuid, text[])', 'EXECUTE'), 'authenticated role can execute role helper');
select ok((select prosecdef from pg_proc where oid = 'public.create_workspace(text, text)'::regprocedure), 'workspace creation RPC runs with SECURITY DEFINER');
select ok(not has_function_privilege('anon', 'public.create_workspace(text, text)', 'EXECUTE'), 'anonymous role cannot execute workspace creation RPC');
select ok(has_function_privilege('authenticated', 'public.create_workspace(text, text)', 'EXECUTE'), 'authenticated role can execute workspace creation RPC');
select has_trigger('public', 'topics', 'topics_prevent_parent_cycle', 'topic hierarchy cycle guard exists');
select has_function('public', 'guard_immutable_identity', array[]::text[], 'immutable identity guard exists');
select has_trigger('public', 'maps', 'maps_guard_identity', 'map workspace ownership cannot be reassigned');
select has_trigger('public', 'topics', 'topics_guard_identity', 'topic identity and map scope cannot be reassigned');
select has_trigger('public', 'map_edges', 'map_edges_guard_identity', 'cross-link identity and map scope cannot be reassigned');

select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'INSERT'), 'authenticated role cannot directly change membership');
select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'UPDATE'), 'authenticated role cannot directly update membership');
select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'DELETE'), 'authenticated role cannot directly delete membership');
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'INSERT'), 'authenticated role cannot directly insert audit events');
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'UPDATE'), 'authenticated role cannot directly update audit events');
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'DELETE'), 'authenticated role cannot directly delete audit events');
select ok(not has_table_privilege('authenticated', 'public.map_revisions', 'INSERT'), 'authenticated role cannot directly insert revisions');
select ok(not has_table_privilege('authenticated', 'public.map_revisions', 'UPDATE'), 'authenticated role cannot update revisions');
select ok(not has_table_privilege('authenticated', 'public.map_revisions', 'DELETE'), 'authenticated role cannot delete revisions');

select ok(not has_table_privilege('authenticated', 'public.workspaces', 'INSERT'), 'authenticated role cannot directly create workspaces');
select ok(not has_table_privilege('authenticated', 'public.workspaces', 'UPDATE'), 'authenticated role cannot directly update workspaces');
select ok(not has_table_privilege('authenticated', 'public.workspaces', 'DELETE'), 'authenticated role cannot directly delete workspaces');
select ok(not has_table_privilege('authenticated', 'public.maps', 'INSERT'), 'authenticated role cannot directly create maps');
select ok(not has_table_privilege('authenticated', 'public.maps', 'UPDATE'), 'authenticated role cannot directly update maps');
select ok(not has_table_privilege('authenticated', 'public.maps', 'DELETE'), 'authenticated role cannot directly delete maps');
select ok(not has_table_privilege('authenticated', 'public.topics', 'INSERT'), 'authenticated role cannot directly create topics');
select ok(not has_table_privilege('authenticated', 'public.topics', 'UPDATE'), 'authenticated role cannot directly update topics');
select ok(not has_table_privilege('authenticated', 'public.topics', 'DELETE'), 'authenticated role cannot directly delete topics');
select ok(not has_table_privilege('authenticated', 'public.map_edges', 'INSERT'), 'authenticated role cannot directly create cross-links');
select ok(not has_table_privilege('authenticated', 'public.map_edges', 'UPDATE'), 'authenticated role cannot directly update cross-links');
select ok(not has_table_privilege('authenticated', 'public.map_edges', 'DELETE'), 'authenticated role cannot directly delete cross-links');

select * from finish();
rollback;
