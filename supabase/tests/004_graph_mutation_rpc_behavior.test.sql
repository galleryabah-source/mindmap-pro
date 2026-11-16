begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Isolated authenticated fixtures. All writes are rolled back at the end of this test.
insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at)
values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated','rpc-editor@example.test','',now(),now()),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated','rpc-viewer@example.test','',now(),now());

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

select * from finish();
rollback;
