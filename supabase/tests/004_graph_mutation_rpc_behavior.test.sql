begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- Isolated authenticated fixtures. All writes are rolled back at the end of this test.
insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at)
values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated','rpc-editor@example.test','',now(),now()),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated','rpc-viewer@example.test','',now(),now()),
 ('33333333-3333-4333-8333-333333333333','authenticated','authenticated','rpc-outsider@example.test','',now(),now());

insert into public.workspaces (id,name,slug,created_by)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','RPC Test Workspace','rpc-test-workspace','11111111-1111-4111-8111-111111111111');
insert into public.workspace_members (workspace_id,user_id,role)
values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','viewer');

select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set local role authenticated;

select set_config('test.map_id',
  public.create_map(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'RPC Test Map',
    '{"version":1,"title":"RPC Test Map","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}}],"edges":[]}'::jsonb,
    'rpc-create-001'
  ) ->> 'map_id',
  true
);

select is(
  (select revision from public.maps where id=current_setting('test.map_id')::uuid),
  1,
  'create_map commits revision 1'
);

select is(
  public.create_map(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'RPC Test Map',
    '{"version":1,"title":"RPC Test Map","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}}],"edges":[]}'::jsonb,
    'rpc-create-001'
  ) ->> 'map_id',
  current_setting('test.map_id'),
  'create_map retry replays the original map identity'
);

select throws_ok(
  $$select public.create_map(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Changed payload',
    '{"version":1,"title":"Changed payload","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}}],"edges":[]}'::jsonb,
    'rpc-create-001'
  )$$,
  '22023',
  'REQUEST_ID_REUSED',
  'same request ID with a different payload is rejected'
);

select is(
  public.save_map_snapshot(
    current_setting('test.map_id')::uuid,
    1,
    '{"version":1,"title":"Revision Two","nodes":[{"id":"root","parentId":null,"position":{"x":10,"y":20},"data":{"label":"Root v2"}}],"edges":[]}'::jsonb,
    'first save',
    'rpc-save-001'
  ) ->> 'revision',
  '2',
  'save_map_snapshot increments revision exactly once'
);

select is(
  public.save_map_snapshot(
    current_setting('test.map_id')::uuid,
    1,
    '{"version":1,"title":"Revision Two","nodes":[{"id":"root","parentId":null,"position":{"x":10,"y":20},"data":{"label":"Root v2"}}],"edges":[]}'::jsonb,
    'first save',
    'rpc-save-001'
  ) ->> 'revision',
  '2',
  'save retry replays its original response despite the now-stale expected revision'
);

select throws_ok(
  $$select public.save_map_snapshot(
    current_setting('test.map_id')::uuid,
    1,
    '{"version":1,"title":"Stale write","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}}],"edges":[]}'::jsonb,
    'stale writer',
    'rpc-save-stale'
  )$$,
  '40001',
  'REVISION_CONFLICT',
  'a second writer using the stale revision is rejected'
);

select is(
  public.restore_map_revision(
    current_setting('test.map_id')::uuid, 1, 2, 'rpc-restore-001'
  ) ->> 'revision',
  '3',
  'restore creates a new revision instead of rewinding history'
);

select is(
  (select count(*)::integer from public.map_revisions where map_id=current_setting('test.map_id')::uuid),
  3,
  'all committed graph states remain in immutable revision history'
);

select is(
  (select count(*)::integer from public.audit_events
   where resource_id=current_setting('test.map_id')::uuid),
  3,
  'create, save and restore each commit an audit event'
);

select throws_ok(
  $$select public.save_map_snapshot(
    current_setting('test.map_id')::uuid,
    3,
    '{}'::jsonb,
    'invalid graph',
    'rpc-save-invalid'
  )$$,
  '22023',
  'INVALID_GRAPH: document envelope is invalid',
  'invalid canonical graph is rejected'
);

select is(
  (select revision from public.maps where id=current_setting('test.map_id')::uuid),
  3,
  'failed graph validation leaves the current revision unchanged'
);

select throws_ok(
  $query$select public.save_map_snapshot(
    current_setting('test.map_id')::uuid, 3,
    '{"version":1,"title":"Duplicate IDs","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}},{"id":"root","parentId":null,"position":{"x":1,"y":1},"data":{"label":"Duplicate"}}],"edges":[]}'::jsonb,
    'duplicate IDs', 'rpc-invalid-duplicate-node'
  )$query$,
  '22023', 'INVALID_GRAPH: duplicate topic IDs',
  'duplicate canonical topic IDs are rejected'
);

select throws_ok(
  $query$select public.save_map_snapshot(
    current_setting('test.map_id')::uuid, 3,
    '{"version":1,"title":"Missing Parent","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}},{"id":"child","parentId":"missing","position":{"x":1,"y":1},"data":{"label":"Child"}}],"edges":[]}'::jsonb,
    'missing parent', 'rpc-invalid-parent'
  )$query$,
  '22023', 'INVALID_GRAPH: a topic references a missing parent',
  'topics referencing a missing parent are rejected'
);

select throws_ok(
  $query$select public.save_map_snapshot(
    current_setting('test.map_id')::uuid, 3,
    '{"version":1,"title":"Cycle","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}},{"id":"a","parentId":"b","position":{"x":1,"y":1},"data":{"label":"A"}},{"id":"b","parentId":"a","position":{"x":2,"y":2},"data":{"label":"B"}}],"edges":[]}'::jsonb,
    'cycle', 'rpc-invalid-cycle'
  )$query$,
  '22023', 'INVALID_GRAPH: hierarchy must be an acyclic tree rooted at root',
  'cyclic hierarchy is rejected'
);

select throws_ok(
  $query$select public.save_map_snapshot(
    current_setting('test.map_id')::uuid, 3,
    '{"version":1,"title":"Self Link","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}}],"edges":[{"id":"link-self","source":"root","target":"root","type":"cross_link"}]}'::jsonb,
    'self link', 'rpc-invalid-self-link'
  )$query$,
  '22023', 'INVALID_GRAPH: one or more cross-links are malformed',
  'cross-links cannot point from a topic to itself'
);

select throws_ok(
  $query$select public.save_map_snapshot(
    current_setting('test.map_id')::uuid, 3,
    '{"version":1,"title":"Duplicate Links","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}},{"id":"child","parentId":"root","position":{"x":1,"y":1},"data":{"label":"Child"}}],"edges":[{"id":"link-a","source":"root","target":"child","type":"cross_link"},{"id":"link-b","source":"child","target":"root","type":"cross_link"}]}'::jsonb,
    'duplicate links', 'rpc-invalid-duplicate-link'
  )$query$,
  '22023', 'INVALID_GRAPH: duplicate cross-links',
  'reversed duplicate cross-links are rejected'
);

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select throws_ok(
  $$select public.save_map_snapshot(
    current_setting('test.map_id')::uuid,
    3,
    '{"version":1,"title":"Viewer write","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}}],"edges":[]}'::jsonb,
    'viewer attempt',
    'rpc-viewer-write'
  )$$,
  '42501',
  'FORBIDDEN',
  'viewer cannot mutate a map in a workspace'
);

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select throws_ok(
  $query$select public.save_map_snapshot(
    current_setting('test.map_id')::uuid,
    3,
    '{"version":1,"title":"Outsider write","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}}],"edges":[]}'::jsonb,
    'outsider attempt',
    'rpc-outsider-write'
  )$query$,
  'P0002',
  'MAP_NOT_FOUND',
  'non-member cannot distinguish an inaccessible map from a missing map'
);

select * from finish();
rollback;
