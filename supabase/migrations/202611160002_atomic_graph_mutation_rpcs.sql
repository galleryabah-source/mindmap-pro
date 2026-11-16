-- Atomic, revision-checked graph persistence RPCs.
-- Browser clients cannot mutate graph tables directly; all writes pass through these RPCs.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_safe_graph_json(p_value jsonb, p_depth integer default 0)
returns boolean
language plpgsql
immutable
set search_path = ''
as $
declare
  v_count integer;
  v_item record;
begin
  if p_depth > 12 then return false; end if;
  case pg_catalog.jsonb_typeof(p_value)
    when 'array' then
      select pg_catalog.count(*) into v_count
      from pg_catalog.jsonb_array_elements(p_value);
      if v_count > 1000 then return false; end if;
      for v_item in select value from pg_catalog.jsonb_array_elements(p_value) loop
        if not private.is_safe_graph_json(v_item.value, p_depth + 1) then return false; end if;
      end loop;
    when 'object' then
      select pg_catalog.count(*) into v_count
      from pg_catalog.jsonb_object_keys(p_value);
      if v_count > 200 then return false; end if;
      for v_item in select key, value from pg_catalog.jsonb_each(p_value) loop
        if pg_catalog.length(v_item.key) > 200
          or not private.is_safe_graph_json(v_item.value, p_depth + 1) then
          return false;
        end if;
      end loop;
    when 'string' then return true;
    when 'number' then return true;
    when 'boolean' then return true;
    when 'null' then return true;
    else return false;
  end case;
  return true;
end;
$;

create or replace function private.validate_graph_document(p_graph jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_node_count integer;
  v_edge_count integer;
  v_root_count integer;
  v_bad_count integer;
begin
  if p_graph is null or coalesce(pg_catalog.jsonb_typeof(p_graph), '') <> 'object'
     or coalesce(p_graph ->> 'version', '') <> '1'
     or coalesce(pg_catalog.jsonb_typeof(p_graph -> 'nodes'), '') <> 'array'
     or coalesce(pg_catalog.jsonb_typeof(p_graph -> 'edges'), '') <> 'array'
     or coalesce(pg_catalog.jsonb_typeof(p_graph -> 'title'), '') <> 'string'
     or pg_catalog.length(pg_catalog.btrim(p_graph ->> 'title')) not between 1 and 240
     or pg_catalog.octet_length(p_graph::text) > 8000000 then
    raise exception 'INVALID_GRAPH: document envelope is invalid' using errcode = '22023';
  end if;

  select pg_catalog.jsonb_array_length(p_graph -> 'nodes'),
         pg_catalog.jsonb_array_length(p_graph -> 'edges')
    into v_node_count, v_edge_count;
  if v_node_count < 1 or v_node_count > 5000 or v_edge_count > 10000 then
    raise exception 'INVALID_GRAPH: graph size is outside supported limits' using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_graph -> 'nodes') n(value)
    where pg_catalog.jsonb_typeof(n.value) <> 'object'
       or coalesce(pg_catalog.jsonb_typeof(n.value -> 'id'), '') <> 'string'
       or coalesce(pg_catalog.length(n.value ->> 'id'), 0) not between 1 and 128
       or coalesce(pg_catalog.jsonb_typeof(n.value -> 'position'), '') <> 'object'
       or coalesce(pg_catalog.jsonb_typeof(n.value #> '{position,x}'), '') <> 'number'
       or coalesce(pg_catalog.jsonb_typeof(n.value #> '{position,y}'), '') <> 'number'
       or pg_catalog.abs((n.value #>> '{position,x}')::numeric) > 10000000
       or pg_catalog.abs((n.value #>> '{position,y}')::numeric) > 10000000
       or coalesce(pg_catalog.jsonb_typeof(n.value -> 'data'), '') <> 'object'
       or coalesce(pg_catalog.jsonb_typeof(n.value #> '{data,label}'), '') <> 'string'
       or coalesce(pg_catalog.length(n.value #>> '{data,label}'), 0) > 2000
       or (n.value #> '{data,notes}' is not null
           and pg_catalog.jsonb_typeof(n.value #> '{data,notes}') <> 'string')
       or pg_catalog.length(coalesce(n.value #>> '{data,notes}', '')) > 50000
       or (n.value ? 'style' and coalesce(pg_catalog.jsonb_typeof(n.value -> 'style'), '') <> 'object')
       or not private.is_safe_graph_json(n.value)
  ) then
    raise exception 'INVALID_GRAPH: one or more topics are malformed' using errcode = '22023';
  end if;

  select count(*) into v_bad_count
  from (
    select n.value ->> 'id' as id
    from pg_catalog.jsonb_array_elements(p_graph -> 'nodes') n(value)
    group by n.value ->> 'id'
    having count(*) > 1
  ) duplicates;
  if v_bad_count > 0 then
    raise exception 'INVALID_GRAPH: duplicate topic IDs' using errcode = '22023';
  end if;

  select count(*) into v_root_count
  from pg_catalog.jsonb_array_elements(p_graph -> 'nodes') n(value)
  where n.value ->> 'id' = 'root'
    and n.value ? 'parentId'
    and n.value -> 'parentId' = 'null'::jsonb;
  if v_root_count <> 1 then
    raise exception 'INVALID_GRAPH: exactly one parentless root is required' using errcode = '22023';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_graph -> 'nodes') n(value)
    where n.value ->> 'id' <> 'root'
      and (coalesce(pg_catalog.jsonb_typeof(n.value -> 'parentId'), '') <> 'string'
           or coalesce(pg_catalog.length(n.value ->> 'parentId'), 0) not between 1 and 128)
  ) then
    raise exception 'INVALID_GRAPH: every non-root topic requires a parent' using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_graph -> 'nodes') n(value)
    where n.value ->> 'id' <> 'root'
      and not exists (
        select 1 from pg_catalog.jsonb_array_elements(p_graph -> 'nodes') p(value)
        where p.value ->> 'id' = n.value ->> 'parentId'
      )
  ) then
    raise exception 'INVALID_GRAPH: a topic references a missing parent' using errcode = '22023';
  end if;

  if exists (
    with recursive walk(start_id, current_id, parent_id, path, cycle) as (
      select n.value ->> 'id', n.value ->> 'id', n.value ->> 'parentId',
             array[n.value ->> 'id'], false
      from pg_catalog.jsonb_array_elements(p_graph -> 'nodes') n(value)
      union all
      select w.start_id, p.value ->> 'id', p.value ->> 'parentId',
             w.path || (p.value ->> 'id'),
             (p.value ->> 'id') = any(w.path)
      from walk w
      join pg_catalog.jsonb_array_elements(p_graph -> 'nodes') p(value)
        on p.value ->> 'id' = w.parent_id
      where w.current_id <> 'root' and not w.cycle
    )
    select 1 from walk
    group by start_id
    having bool_or(cycle) or not bool_or(current_id = 'root')
  ) then
    raise exception 'INVALID_GRAPH: hierarchy must be an acyclic tree rooted at root' using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_graph -> 'edges') e(value)
    where pg_catalog.jsonb_typeof(e.value) <> 'object'
       or coalesce(pg_catalog.jsonb_typeof(e.value -> 'id'), '') <> 'string'
       or coalesce(pg_catalog.length(e.value ->> 'id'), 0) not between 1 and 128
       or coalesce(pg_catalog.jsonb_typeof(e.value -> 'source'), '') <> 'string'
       or coalesce(pg_catalog.length(e.value ->> 'source'), 0) not between 1 and 128
       or coalesce(pg_catalog.jsonb_typeof(e.value -> 'target'), '') <> 'string'
       or coalesce(pg_catalog.length(e.value ->> 'target'), 0) not between 1 and 128
       or e.value ->> 'source' = e.value ->> 'target'
       or coalesce(e.value ->> 'type', '') <> 'cross_link'
       or (e.value ? 'label' and coalesce(pg_catalog.jsonb_typeof(e.value -> 'label'), '') <> 'string')
       or pg_catalog.length(coalesce(e.value ->> 'label', '')) > 500
       or (e.value ? 'style' and coalesce(pg_catalog.jsonb_typeof(e.value -> 'style'), '') <> 'object')
       or not private.is_safe_graph_json(e.value)
       or not exists (select 1 from pg_catalog.jsonb_array_elements(p_graph -> 'nodes') n(value)
                      where n.value ->> 'id' = e.value ->> 'source')
       or not exists (select 1 from pg_catalog.jsonb_array_elements(p_graph -> 'nodes') n(value)
                      where n.value ->> 'id' = e.value ->> 'target')
  ) then
    raise exception 'INVALID_GRAPH: one or more cross-links are malformed' using errcode = '22023';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_graph -> 'edges') e(value)
    group by e.value ->> 'id' having count(*) > 1
  ) or exists (
    select 1 from pg_catalog.jsonb_array_elements(p_graph -> 'edges') e(value)
    group by least(e.value ->> 'source', e.value ->> 'target'),
             greatest(e.value ->> 'source', e.value ->> 'target')
    having count(*) > 1
  ) then
    raise exception 'INVALID_GRAPH: duplicate cross-links' using errcode = '22023';
  end if;
end;
$$;

create or replace function private.claim_graph_mutation(
  p_actor uuid, p_request_id text, p_operation text, p_payload_hash text,
  p_workspace_id uuid default null, p_map_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted uuid;
  v_existing public.graph_mutation_requests%rowtype;
begin
  if p_request_id is null or pg_catalog.length(pg_catalog.btrim(p_request_id)) not between 1 and 128 then
    raise exception 'INVALID_REQUEST_ID' using errcode = '22023';
  end if;
  insert into public.graph_mutation_requests(
    actor_user_id, request_id, operation, workspace_id, map_id, payload_hash
  ) values (p_actor, p_request_id, p_operation, p_workspace_id, p_map_id, p_payload_hash)
  on conflict (actor_user_id, request_id) do nothing
  returning id into v_inserted;

  if v_inserted is not null then
    return null;
  end if;

  select * into v_existing
  from public.graph_mutation_requests
  where actor_user_id = p_actor and request_id = p_request_id
  for update;

  if v_existing.operation <> p_operation or v_existing.payload_hash <> p_payload_hash then
    raise exception 'REQUEST_ID_REUSED' using errcode = '22023';
  end if;
  if v_existing.completed_at is null then
    raise exception 'PERSISTENCE_ERROR: idempotency request is incomplete' using errcode = '55000';
  end if;
  return v_existing.response;
end;
$$;

create or replace function private.complete_graph_mutation(
  p_actor uuid, p_request_id text, p_response jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.graph_mutation_requests
  set response = p_response, completed_at = pg_catalog.now()
  where actor_user_id = p_actor and request_id = p_request_id
    and completed_at is null;
$$;

create or replace function private.replace_graph_content(
  p_map_id uuid, p_actor uuid, p_graph jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.validate_graph_document(p_graph);

  delete from public.map_edges where map_id = p_map_id;
  delete from public.topics where map_id = p_map_id;

  insert into public.topics(
    id, map_id, parent_id, title, notes, position_x, position_y, style, metadata, created_by
  )
  select
    n.value ->> 'id',
    p_map_id,
    nullif(n.value ->> 'parentId', ''),
    n.value #>> '{data,label}',
    coalesce(n.value #>> '{data,notes}', ''),
    (n.value #>> '{position,x}')::double precision,
    (n.value #>> '{position,y}')::double precision,
    coalesce(n.value -> 'style', '{}'::jsonb),
    pg_catalog.jsonb_build_object(
      'node', n.value - array['id','parentId','position','data','style'],
      'data', (n.value -> 'data') - array['label','notes']
    ),
    p_actor
  from pg_catalog.jsonb_array_elements(p_graph -> 'nodes') n(value);

  insert into public.map_edges(
    id, map_id, source_topic_id, target_topic_id, edge_type, label, style, metadata, created_by
  )
  select
    e.value ->> 'id', p_map_id, e.value ->> 'source', e.value ->> 'target',
    'cross_link', coalesce(e.value ->> 'label', ''),
    coalesce(e.value -> 'style', '{}'::jsonb),
    e.value - 'id' - 'source' - 'target' - 'type' - 'label' - 'style',
    p_actor
  from pg_catalog.jsonb_array_elements(p_graph -> 'edges') e(value);
end;
$$;

create or replace function public.create_map(
  p_workspace_id uuid, p_title text, p_initial_graph jsonb, p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_map_id uuid;
  v_graph jsonb;
  v_hash text;
  v_replay jsonb;
  v_result jsonb;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.has_workspace_role(p_workspace_id, array['owner','admin','editor']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  v_graph := coalesce(p_initial_graph, '{}'::jsonb);
  perform private.validate_graph_document(v_graph);
  if p_title is not null and pg_catalog.btrim(p_title) <> '' then
    v_graph := pg_catalog.jsonb_set(v_graph, '{title}', pg_catalog.to_jsonb(pg_catalog.btrim(p_title)), true);
    perform private.validate_graph_document(v_graph);
  end if;
  v_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_build_object('operation','create_map','workspace_id',p_workspace_id,
      'graph',v_graph)::text, 'UTF8'), 'sha256'), 'hex');
  v_replay := private.claim_graph_mutation(v_actor,p_request_id,'create_map',v_hash,p_workspace_id,null);
  if v_replay is not null then return v_replay; end if;

  insert into public.maps(workspace_id,title,revision,schema_version,created_by)
  values (p_workspace_id,v_graph ->> 'title',1,1,v_actor)
  returning id into v_map_id;

  perform private.replace_graph_content(v_map_id,v_actor,v_graph);

  insert into public.map_revisions(map_id,revision,schema_version,snapshot,created_by,note)
  values (v_map_id,1,1,v_graph,v_actor,'Initial graph');

  insert into public.audit_events(workspace_id,actor_user_id,action,resource_type,resource_id,request_id,details)
  values (p_workspace_id,v_actor,'map.created','map',v_map_id,p_request_id,
          pg_catalog.jsonb_build_object('revision',1,'node_count',pg_catalog.jsonb_array_length(v_graph->'nodes'),
                                        'edge_count',pg_catalog.jsonb_array_length(v_graph->'edges')));

  v_result := pg_catalog.jsonb_build_object('map_id',v_map_id,'revision',1,'schema_version',1,'graph',v_graph);
  perform private.complete_graph_mutation(v_actor,p_request_id,v_result);
  return v_result;
end;
$$;

create or replace function public.save_map_snapshot(
  p_map_id uuid, p_expected_revision integer, p_graph jsonb, p_note text, p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_map public.maps%rowtype;
  v_graph jsonb;
  v_hash text;
  v_replay jsonb;
  v_revision integer;
  v_result jsonb;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_map from public.maps where id = p_map_id and deleted_at is null for update;
  if not found then raise exception 'MAP_NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.has_workspace_role(v_map.workspace_id,array['owner','admin','editor']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  v_graph := coalesce(p_graph,'{}'::jsonb);
  perform private.validate_graph_document(v_graph);
  v_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_build_object('operation','save_map_snapshot','map_id',p_map_id,
      'expected_revision',p_expected_revision,'graph',v_graph,'note',coalesce(p_note,''))::text, 'UTF8'),
    'sha256'),'hex');
  v_replay := private.claim_graph_mutation(v_actor,p_request_id,'save_map_snapshot',v_hash,v_map.workspace_id,p_map_id);
  if v_replay is not null then return v_replay; end if;
  if p_expected_revision is null or p_expected_revision <> v_map.revision then
    raise exception 'REVISION_CONFLICT' using errcode = '40001';
  end if;

  v_revision := v_map.revision + 1;
  perform private.replace_graph_content(p_map_id,v_actor,v_graph);
  update public.maps set title=v_graph->>'title', revision=v_revision, schema_version=1
  where id=p_map_id;
  insert into public.map_revisions(map_id,revision,schema_version,snapshot,created_by,note)
  values (p_map_id,v_revision,1,v_graph,v_actor,coalesce(pg_catalog.left(p_note,1000), ''));
  insert into public.audit_events(workspace_id,actor_user_id,action,resource_type,resource_id,request_id,details)
  values (v_map.workspace_id,v_actor,'map.snapshot_saved','map',p_map_id,p_request_id,
          pg_catalog.jsonb_build_object('revision',v_revision,'previous_revision',v_map.revision));
  v_result := pg_catalog.jsonb_build_object('map_id',p_map_id,'revision',v_revision,'schema_version',1,'graph',v_graph);
  perform private.complete_graph_mutation(v_actor,p_request_id,v_result);
  return v_result;
end;
$$;

create or replace function public.restore_map_revision(
  p_map_id uuid, p_source_revision integer, p_expected_revision integer, p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_map public.maps%rowtype;
  v_graph jsonb;
  v_hash text;
  v_replay jsonb;
  v_revision integer;
  v_result jsonb;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_map from public.maps where id=p_map_id and deleted_at is null for update;
  if not found then raise exception 'MAP_NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.has_workspace_role(v_map.workspace_id,array['owner','admin','editor']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select snapshot into v_graph from public.map_revisions
  where map_id=p_map_id and revision=p_source_revision;
  if not found then raise exception 'MAP_NOT_FOUND: source revision not found' using errcode = 'P0002'; end if;
  perform private.validate_graph_document(v_graph);
  v_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_build_object('operation','restore_map_revision','map_id',p_map_id,
      'source_revision',p_source_revision,'expected_revision',p_expected_revision)::text, 'UTF8'),
    'sha256'),'hex');
  v_replay := private.claim_graph_mutation(v_actor,p_request_id,'restore_map_revision',v_hash,v_map.workspace_id,p_map_id);
  if v_replay is not null then return v_replay; end if;
  if p_expected_revision is null or p_expected_revision <> v_map.revision then
    raise exception 'REVISION_CONFLICT' using errcode = '40001';
  end if;

  v_revision := v_map.revision + 1;
  perform private.replace_graph_content(p_map_id,v_actor,v_graph);
  update public.maps set title=v_graph->>'title', revision=v_revision, schema_version=1
  where id=p_map_id;
  insert into public.map_revisions(map_id,revision,schema_version,snapshot,created_by,note)
  values (p_map_id,v_revision,1,v_graph,v_actor,
          pg_catalog.left('Restored from revision ' || p_source_revision::text,1000));
  insert into public.audit_events(workspace_id,actor_user_id,action,resource_type,resource_id,request_id,details)
  values (v_map.workspace_id,v_actor,'map.revision_restored','map',p_map_id,p_request_id,
          pg_catalog.jsonb_build_object('revision',v_revision,'source_revision',p_source_revision,
                                        'previous_revision',v_map.revision));
  v_result := pg_catalog.jsonb_build_object('map_id',p_map_id,'revision',v_revision,
                                             'schema_version',1,'source_revision',p_source_revision,'graph',v_graph);
  perform private.complete_graph_mutation(v_actor,p_request_id,v_result);
  return v_result;
end;
$$;

revoke all on function public.create_map(uuid,text,jsonb,text) from public, anon;
revoke all on function public.save_map_snapshot(uuid,integer,jsonb,text,text) from public, anon;
revoke all on function public.restore_map_revision(uuid,integer,integer,text) from public, anon;
grant execute on function public.create_map(uuid,text,jsonb,text) to authenticated;
grant execute on function public.save_map_snapshot(uuid,integer,jsonb,text,text) to authenticated;
grant execute on function public.restore_map_revision(uuid,integer,integer,text) to authenticated;

revoke all on function private.is_safe_graph_json(jsonb,integer) from public, anon, authenticated;
revoke all on function private.validate_graph_document(jsonb) from public, anon, authenticated;
revoke all on function private.claim_graph_mutation(uuid,text,text,text,uuid,uuid) from public, anon, authenticated;
revoke all on function private.complete_graph_mutation(uuid,text,jsonb) from public, anon, authenticated;
revoke all on function private.replace_graph_content(uuid,uuid,jsonb) from public, anon, authenticated;

commit;
