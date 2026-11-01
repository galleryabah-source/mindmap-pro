begin;

create extension if not exists pgtap with schema extensions;
select plan(38);

select has_table('public', 'map_write_requests', 'idempotency ledger table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.map_write_requests'::regclass), 'idempotency ledger has RLS enabled');
select has_function('public', 'create_map_with_graph', array['uuid', 'uuid', 'jsonb', 'text'], 'atomic map creation RPC exists');
select has_function('public', 'commit_map_graph', array['uuid', 'integer', 'uuid', 'jsonb', 'text'], 'atomic graph commit RPC exists');
select ok((select prosecdef from pg_proc where oid = 'public.create_map_with_graph(uuid, uuid, jsonb, text)'::regprocedure), 'map creation RPC is SECURITY DEFINER');
select ok((select prosecdef from pg_proc where oid = 'public.commit_map_graph(uuid, integer, uuid, jsonb, text)'::regprocedure), 'graph commit RPC is SECURITY DEFINER');
select ok(not has_function_privilege('anon', 'public.create_map_with_graph(uuid, uuid, jsonb, text)', 'EXECUTE'), 'anonymous role cannot execute map creation RPC');
select ok(not has_function_privilege('anon', 'public.commit_map_graph(uuid, integer, uuid, jsonb, text)', 'EXECUTE'), 'anonymous role cannot execute graph commit RPC');
select ok(has_function_privilege('authenticated', 'public.create_map_with_graph(uuid, uuid, jsonb, text)', 'EXECUTE'), 'authenticated role can execute map creation RPC');
select ok(has_function_privilege('authenticated', 'public.commit_map_graph(uuid, integer, uuid, jsonb, text)', 'EXECUTE'), 'authenticated role can execute graph commit RPC');
select ok(not has_table_privilege('authenticated', 'public.map_write_requests', 'SELECT'), 'authenticated role cannot read idempotency ledger directly');
select ok(not has_table_privilege('authenticated', 'public.map_write_requests', 'INSERT'), 'authenticated role cannot insert idempotency records directly');
select ok(not has_table_privilege('authenticated', 'public.map_write_requests', 'UPDATE'), 'authenticated role cannot update idempotency records directly');
select ok(not has_table_privilege('authenticated', 'public.map_write_requests', 'DELETE'), 'authenticated role cannot delete idempotency records directly');

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000101',
  'authenticated', 'authenticated', 'graph-rpc-owner@mindmap.invalid', '',
  '{}'::jsonb, '{}'::jsonb, now(), now()
)
on conflict (id) do nothing;

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000102',
  'authenticated', 'authenticated', 'graph-rpc-viewer@mindmap.invalid', '',
  '{}'::jsonb, '{}'::jsonb, now(), now()
)
on conflict (id) do nothing;

insert into public.workspaces (id, name, slug, created_by)
values (
  '00000000-0000-0000-0000-000000000201',
  'Graph RPC Test Workspace',
  'graph-rpc-test-workspace',
  '00000000-0000-0000-0000-000000000101'
)
on conflict (id) do nothing;

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'owner'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 'viewer')
on conflict (workspace_id, user_id) do update set role = excluded.role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

create temp table graph_rpc_state (
  document jsonb not null,
  map_id uuid,
  create_response jsonb,
  commit_document jsonb,
  commit_response jsonb
) on commit drop;

insert into graph_rpc_state (document)
values (
  '{
    "format": "mindmap-pro",
    "version": 2,
    "graph": {
      "version": 1,
      "title": "RPC Test Map",
      "nodes": [
        {"id": "root", "parentId": null, "position": {"x": 0, "y": 0}, "data": {"label": "Root"}},
        {"id": "topic-a", "parentId": "root", "position": {"x": 100, "y": 100}, "data": {"label": "Topic A", "notes": "Initial note"}},
        {"id": "topic-b", "parentId": "root", "position": {"x": 200, "y": 100}, "data": {"label": "Topic B"}}
      ],
      "edges": [
        {"id": "link-a-b", "source": "topic-a", "target": "topic-b", "type": "cross_link", "label": "Related"}
      ]
    }
  }'::jsonb
);

update graph_rpc_state
set create_response = public.create_map_with_graph(
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000301',
  document,
  'Atomic graph RPC test'
);

update graph_rpc_state
set map_id = (create_response ->> 'mapId')::uuid,
    commit_document = jsonb_set(document, '{graph,nodes,1,data,label}', '"Topic A Updated"'::jsonb);

select is((select (create_response ->> 'revision')::integer from graph_rpc_state), 1, 'map creation starts at revision 1');
select is((select count(*)::integer from public.topics where map_id = (select map_id from graph_rpc_state)), 3, 'map creation writes root and all topics');
select is((select count(*)::integer from public.map_edges where map_id = (select map_id from graph_rpc_state)), 1, 'map creation writes canonical cross-links');
select is((select count(*)::integer from public.map_revisions where map_id = (select map_id from graph_rpc_state)), 1, 'map creation writes initial immutable snapshot');
select is((select count(*)::integer from public.audit_events where resource_id = (select map_id from graph_rpc_state)), 1, 'map creation writes one audit event');
select is((select count(*)::integer from public.map_write_requests where map_id = (select map_id from graph_rpc_state)), 1, 'map creation writes one idempotency record');

select is(
  public.create_map_with_graph(
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000301',
    (select document from graph_rpc_state),
    'Atomic graph RPC test'
  )::text,
  (select create_response::text from graph_rpc_state),
  'replaying the same create request returns the original response'
);

select throws_ok(
  $$select public.create_map_with_graph(
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000301',
    jsonb_set((select document from graph_rpc_state), '{graph,title}', '"Different Payload"'::jsonb),
    'Atomic graph RPC test'
  )$$,
  '23505',
  'reusing a create request ID with a different payload is rejected'
);

update graph_rpc_state
set commit_response = public.commit_map_graph(
  map_id,
  1,
  '00000000-0000-0000-0000-000000000302',
  commit_document,
  'Update topic label'
);

select is((select (commit_response ->> 'revision')::integer from graph_rpc_state), 2, 'graph commit advances exactly one revision');
select is((select revision from public.maps where id = (select map_id from graph_rpc_state)), 2, 'map current revision is updated atomically');
select is((select count(*)::integer from public.map_revisions where map_id = (select map_id from graph_rpc_state)), 2, 'graph commit appends a second immutable snapshot');
select is((select count(*)::integer from public.audit_events where resource_id = (select map_id from graph_rpc_state)), 2, 'graph commit writes one matching audit event');
select is((select count(*)::integer from public.map_write_requests where map_id = (select map_id from graph_rpc_state)), 2, 'graph commit writes one idempotency record');

select is(
  public.commit_map_graph(
    (select map_id from graph_rpc_state),
    1,
    '00000000-0000-0000-0000-000000000302',
    (select commit_document from graph_rpc_state),
    'Update topic label'
  )::text,
  (select commit_response::text from graph_rpc_state),
  'replaying the same graph commit returns the original response'
);

select throws_ok(
  $$select public.commit_map_graph(
    (select map_id from graph_rpc_state),
    1,
    '00000000-0000-0000-0000-000000000303',
    (select commit_document from graph_rpc_state),
    'Stale write'
  )$$,
  '40001',
  'stale expected revision is rejected'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);

select throws_ok(
  $$select public.commit_map_graph(
    (select map_id from graph_rpc_state),
    2,
    '00000000-0000-0000-0000-000000000304',
    (select commit_document from graph_rpc_state),
    'Viewer write'
  )$$,
  '42501',
  'viewer cannot commit a graph revision'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

select throws_ok(
  $$select public.commit_map_graph(
    (select map_id from graph_rpc_state),
    2,
    '00000000-0000-0000-0000-000000000305',
    jsonb_set((select document from graph_rpc_state), '{graph,nodes}', '[{"id":"topic-only","parentId":"root","position":{"x":0,"y":0},"data":{"label":"No root"}}]'::jsonb),
    'Missing root'
  )$$,
  '22023',
  'graph without root is rejected'
);

select throws_ok(
  $$select public.commit_map_graph(
    (select map_id from graph_rpc_state),
    2,
    '00000000-0000-0000-0000-000000000306',
    jsonb_set((select document from graph_rpc_state), '{graph,nodes}', '[
      {"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}},
      {"id":"topic-a","parentId":"topic-b","position":{"x":1,"y":1},"data":{"label":"A"}},
      {"id":"topic-b","parentId":"topic-a","position":{"x":2,"y":2},"data":{"label":"B"}}
    ]'::jsonb),
    'Cycle'
  )$$,
  '22023',
  'disconnected cyclic hierarchy is rejected'
);

select throws_ok(
  $$select public.commit_map_graph(
    (select map_id from graph_rpc_state),
    2,
    '00000000-0000-0000-0000-000000000307',
    jsonb_set((select document from graph_rpc_state), '{graph,edges}', '[
      {"id":"link-one","source":"topic-a","target":"topic-b","type":"cross_link"},
      {"id":"link-two","source":"topic-b","target":"topic-a","type":"cross_link"}
    ]'::jsonb),
    'Duplicate cross-link'
  )$$,
  '22023',
  'duplicate undirected cross-links are rejected'
);

select is((select revision from public.maps where id = (select map_id from graph_rpc_state)), 2, 'rejected graph writes do not change the map revision');
select is((select count(*)::integer from public.map_revisions where map_id = (select map_id from graph_rpc_state)), 2, 'rejected graph writes do not append revisions');
select is((select count(*)::integer from public.audit_events where resource_id = (select map_id from graph_rpc_state)), 2, 'rejected graph writes do not append audit events');
select is((select count(*)::integer from public.map_write_requests where map_id = (select map_id from graph_rpc_state)), 2, 'rejected graph writes leave no idempotency records');

select * from finish();
rollback;
