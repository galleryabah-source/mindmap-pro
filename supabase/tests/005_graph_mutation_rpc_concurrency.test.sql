begin;
create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
select plan(4);

insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at)
values
 ('33333333-3333-4333-8333-333333333333','authenticated','authenticated','rpc-concurrency@example.test','',now(),now());

insert into public.workspaces (id,name,slug,created_by)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','RPC Concurrency Workspace','rpc-concurrency-20261116','33333333-3333-4333-8333-333333333333');
insert into public.workspace_members (workspace_id,user_id,role)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','33333333-3333-4333-8333-333333333333','owner');

create or replace function public.test_graph_rpc_concurrency_attempt(
  p_map_id uuid, p_graph jsonb, p_request_id text
)
returns text
language plpgsql
set search_path = ''
as $
begin
  perform public.save_map_snapshot(p_map_id,1,p_graph,'concurrency test',p_request_id);
  return 'SUCCESS';
exception when others then
  return sqlstate || ':' || sqlerrm;
end;
$$;

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
set role authenticated;
select set_config(
  'test.concurrent_map_id',
  public.create_map(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Concurrency Base',
    '{"version":1,"title":"Concurrency Base","nodes":[{"id":"root","parentId":null,"position":{"x":0,"y":0},"data":{"label":"Root"}}],"edges":[]}'::jsonb,
    'rpc-concurrency-create'
  ) ->> 'map_id',
  false
);
reset role;
commit;

select is(extensions.dblink_connect('rpc_a','dbname=postgres'), 'OK', 'first independent database session connects');
select is(extensions.dblink_connect('rpc_b','dbname=postgres'), 'OK', 'second independent database session connects');

select extensions.dblink_exec('rpc_a','set request.jwt.claim.sub = ''33333333-3333-4333-8333-333333333333''');
select extensions.dblink_exec('rpc_a','set role authenticated');
select extensions.dblink_exec('rpc_b','set request.jwt.claim.sub = ''33333333-3333-4333-8333-333333333333''');
select extensions.dblink_exec('rpc_b','set role authenticated');

do $$
declare
  v_map_id text := current_setting('test.concurrent_map_id');
  v_graph_a text := '{"version":1,"title":"Concurrent A","nodes":[{"id":"root","parentId":null,"position":{"x":1,"y":1},"data":{"label":"Root A"}}],"edges":[]}';
  v_graph_b text := '{"version":1,"title":"Concurrent B","nodes":[{"id":"root","parentId":null,"position":{"x":2,"y":2},"data":{"label":"Root B"}}],"edges":[]}';
  v_query_a text;
  v_query_b text;
  v_result_a text;
  v_result_b text;
begin
  v_query_a := pg_catalog.format(
    'with delay as materialized (select pg_catalog.pg_sleep(1)) select public.test_graph_rpc_concurrency_attempt(%L::uuid,%L::jsonb,%L) from delay',
    v_map_id,v_graph_a,'rpc-concurrency-a'
  );
  v_query_b := pg_catalog.format(
    'with delay as materialized (select pg_catalog.pg_sleep(1)) select public.test_graph_rpc_concurrency_attempt(%L::uuid,%L::jsonb,%L) from delay',
    v_map_id,v_graph_b,'rpc-concurrency-b'
  );

  if extensions.dblink_send_query('rpc_a',v_query_a) <> 1 then
    raise exception 'could not start first concurrent graph write';
  end if;
  perform pg_catalog.pg_sleep(0.1);
  if extensions.dblink_send_query('rpc_b',v_query_b) <> 1 then
    raise exception 'could not start second concurrent graph write';
  end if;

  select result into v_result_a
  from extensions.dblink_get_result('rpc_a') as result_row(result text);
  select result into v_result_b
  from extensions.dblink_get_result('rpc_b') as result_row(result text);
  perform * from extensions.dblink_get_result('rpc_a') as result_row(result text);
  perform * from extensions.dblink_get_result('rpc_b') as result_row(result text);

  perform pg_catalog.set_config('test.concurrent_results',v_result_a || '|' || v_result_b,false);
end;
$$;

select is(
  (select array_agg(result order by result)
   from pg_catalog.unnest(pg_catalog.string_to_array(current_setting('test.concurrent_results'),'|')) as values_list(result)),
  array['40001:REVISION_CONFLICT','SUCCESS']::text[],
  'two simultaneous writers with the same expected revision produce one commit and one conflict'
);

select is(
  (select revision from public.maps where id=current_setting('test.concurrent_map_id')::uuid),
  2,
  'concurrent graph writes increment the map revision exactly once'
);

select extensions.dblink_disconnect('rpc_a');
select extensions.dblink_disconnect('rpc_b');

drop function public.test_graph_rpc_concurrency_attempt(uuid,jsonb,text);
delete from public.graph_mutation_requests
where actor_user_id='33333333-3333-4333-8333-333333333333';
delete from public.workspaces where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
delete from auth.users where id='33333333-3333-4333-8333-333333333333';

select * from finish();
