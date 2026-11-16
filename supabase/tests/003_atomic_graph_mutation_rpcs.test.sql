begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_function('public','create_map',array['uuid','text','jsonb','text'],'create_map RPC exists');
select has_function('public','save_map_snapshot',array['uuid','integer','jsonb','text','text'],'save snapshot RPC exists');
select has_function('public','restore_map_revision',array['uuid','integer','integer','text'],'restore revision RPC exists');

select ok(has_function_privilege('authenticated','public.create_map(uuid,text,jsonb,text)','EXECUTE'),
  'authenticated role can invoke create_map');
select ok(not has_function_privilege('anon','public.create_map(uuid,text,jsonb,text)','EXECUTE'),
  'anonymous role cannot invoke create_map');
select ok(has_function_privilege('authenticated','public.save_map_snapshot(uuid,integer,jsonb,text,text)','EXECUTE'),
  'authenticated role can invoke save_map_snapshot');
select ok(not has_function_privilege('anon','public.save_map_snapshot(uuid,integer,jsonb,text,text)','EXECUTE'),
  'anonymous role cannot invoke save_map_snapshot');
select ok(has_function_privilege('authenticated','public.restore_map_revision(uuid,integer,integer,text)','EXECUTE'),
  'authenticated role can invoke restore_map_revision');
select ok(not has_function_privilege('anon','public.restore_map_revision(uuid,integer,integer,text)','EXECUTE'),
  'anonymous role cannot invoke restore_map_revision');

select ok((select prosecdef and proconfig @> array['search_path=""']
  from pg_catalog.pg_proc where oid='public.create_map(uuid,text,jsonb,text)'::regprocedure),
  'create_map is SECURITY DEFINER with an empty search_path');
select ok((select prosecdef and proconfig @> array['search_path=""']
  from pg_catalog.pg_proc where oid='public.save_map_snapshot(uuid,integer,jsonb,text,text)'::regprocedure),
  'save_map_snapshot is SECURITY DEFINER with an empty search_path');
select ok((select prosecdef and proconfig @> array['search_path=""']
  from pg_catalog.pg_proc where oid='public.restore_map_revision(uuid,integer,integer,text)'::regprocedure),
  'restore_map_revision is SECURITY DEFINER with an empty search_path');

select ok(not has_schema_privilege('authenticated','private','USAGE'),
  'authenticated role cannot access private RPC helper schema');
select ok(not has_schema_privilege('anon','private','USAGE'),
  'anonymous role cannot access private RPC helper schema');

select * from finish();
rollback;
