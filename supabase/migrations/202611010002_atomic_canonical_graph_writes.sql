-- MindMap Pro: atomic canonical graph persistence RPCs.
-- This migration is intentionally isolated and must be validated in disposable PostgreSQL CI.
-- It does not connect to or modify any hosted Supabase project.

begin;

create table if not exists public.map_write_requests (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  request_id uuid not null,
  map_id uuid references public.maps(id) on delete restrict,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  result_revision integer not null check (result_revision > 0),
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now(),
  primary key (workspace_id, actor_user_id, request_id)
);

create index if not exists map_write_requests_map_created_idx
  on public.map_write_requests (map_id, created_at desc)
  where map_id is not null;

alter table public.map_write_requests enable row level security;
revoke all on public.map_write_requests from anon, authenticated;

create or replace function public.is_safe_jsonb(p_value jsonb, p_depth integer default 0)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_item jsonb;
  v_key text;
begin
  if p_depth > 12 then
    return false;
  end if;

  case jsonb_typeof(p_value)
    when 'object' then
      if (select count(*) from jsonb_each(p_value)) > 200 then
        return false;
      end if;
      for v_key, v_item in select key, value from jsonb_each(p_value) loop
        if char_length(v_key) > 200 or not public.is_safe_jsonb(v_item, p_depth + 1) then
          return false;
        end if;
      end loop;
      return true;
    when 'array' then
      if jsonb_array_length(p_value) > 1000 then
        return false;
      end if;
      for v_item in select value from jsonb_array_elements(p_value) loop
        if not public.is_safe_jsonb(v_item, p_depth + 1) then
          return false;
        end if;
      end loop;
      return true;
    when 'string', 'number', 'boolean', 'null' then
      return true;
    else
      return false;
  end case;
end;
$$;

create or replace function public.encode_uri_component(p_value text)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_bytes bytea := convert_to(p_value, 'UTF8');
  v_result text := '';
  v_byte integer;
  v_index integer;
begin
  if octet_length(v_bytes) = 0 then
    return '';
  end if;

  for v_index in 0..octet_length(v_bytes) - 1 loop
    v_byte := get_byte(v_bytes, v_index);
    if (v_byte between 48 and 57)
      or (v_byte between 65 and 90)
      or (v_byte between 97 and 122)
      or v_byte in (45, 95, 46, 33, 126, 42, 39, 40, 41) then
      v_result := v_result || chr(v_byte);
    else
      v_result := v_result || '%' || upper(lpad(to_hex(v_byte), 2, '0'));
    end if;
  end loop;
  return v_result;
end;
$$;

create or replace function public.assert_canonical_graph_document(p_document jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_graph jsonb;
  v_nodes jsonb;
  v_edges jsonb;
  v_node jsonb;
  v_edge jsonb;
  v_id text;
  v_count integer;
  v_reachable integer;
begin
  if p_document is null or jsonb_typeof(p_document) <> 'object'
    or p_document ->> 'format' <> 'mindmap-pro'
    or p_document ->> 'version' <> '2' then
    raise exception 'Canonical document envelope is invalid' using errcode = '22023';
  end if;

  v_graph := p_document -> 'graph';
  if jsonb_typeof(v_graph) <> 'object' or v_graph ->> 'version' <> '1' then
    raise exception 'Canonical graph version is invalid' using errcode = '22023';
  end if;

  if jsonb_typeof(v_graph -> 'title') <> 'string'
    or char_length(btrim(v_graph ->> 'title')) not between 1 and 240 then
    raise exception 'Graph title must contain 1 to 240 characters' using errcode = '22023';
  end if;

  v_nodes := v_graph -> 'nodes';
  v_edges := v_graph -> 'edges';
  if jsonb_typeof(v_nodes) <> 'array'
    or jsonb_array_length(v_nodes) not between 1 and 5000
    or jsonb_typeof(v_edges) <> 'array'
    or jsonb_array_length(v_edges) > 10000 then
    raise exception 'Canonical graph node or edge count is invalid' using errcode = '22023';
  end if;

  select count(*) into v_count
  from (
    select value ->> 'id'
    from jsonb_array_elements(v_nodes) as n(value)
    group by value ->> 'id'
    having count(*) > 1
  ) duplicates;
  if v_count > 0 then
    raise exception 'Duplicate topic IDs are not allowed' using errcode = '22023';
  end if;

  for v_node in select value from jsonb_array_elements(v_nodes) as n(value) loop
    if jsonb_typeof(v_node) <> 'object'
      or jsonb_typeof(v_node -> 'id') <> 'string'
      or char_length(btrim(v_node ->> 'id')) not between 1 and 128 then
      raise exception 'Topic identity is invalid' using errcode = '22023';
    end if;

    v_id := v_node ->> 'id';
    if jsonb_typeof(v_node -> 'position') <> 'object'
      or jsonb_typeof(v_node -> 'position' -> 'x') <> 'number'
      or jsonb_typeof(v_node -> 'position' -> 'y') <> 'number'
      or abs((v_node -> 'position' ->> 'x')::numeric) > 10000000
      or abs((v_node -> 'position' ->> 'y')::numeric) > 10000000 then
      raise exception 'Topic position is invalid' using errcode = '22023';
    end if;

    if jsonb_typeof(v_node -> 'data') <> 'object'
      or jsonb_typeof(v_node -> 'data' -> 'label') <> 'string'
      or char_length(v_node -> 'data' ->> 'label') > 2000
      or (v_node -> 'data' ? 'notes' and (
        jsonb_typeof(v_node -> 'data' -> 'notes') <> 'string'
        or char_length(v_node -> 'data' ->> 'notes') > 50000
      ))
      or not public.is_safe_jsonb(v_node -> 'data') then
      raise exception 'Topic data or metadata is invalid' using errcode = '22023';
    end if;

    if v_node ? 'style' and (
      jsonb_typeof(v_node -> 'style') <> 'object'
      or not public.is_safe_jsonb(v_node -> 'style')
    ) then
      raise exception 'Topic style is invalid' using errcode = '22023';
    end if;

    if v_id = 'root' then
      if not (v_node ? 'parentId') or v_node -> 'parentId' <> 'null'::jsonb then
        raise exception 'Root topic must have parentId null' using errcode = '22023';
      end if;
    elsif jsonb_typeof(v_node -> 'parentId') <> 'string'
      or char_length(btrim(v_node ->> 'parentId')) not between 1 and 128 then
      raise exception 'Every non-root topic must have a valid parentId' using errcode = '22023';
    end if;
  end loop;

  select count(*) into v_count
  from jsonb_array_elements(v_nodes) as n(value)
  where value ->> 'id' = 'root';
  if v_count <> 1 then
    raise exception 'Canonical graph must contain exactly one root topic' using errcode = '22023';
  end if;

  with recursive reachable(id) as (
    select 'root'::text
    union
    select n.value ->> 'id'
    from jsonb_array_elements(v_nodes) as n(value)
    join reachable r on n.value ->> 'parentId' = r.id
    where n.value ->> 'id' <> 'root'
  )
  select count(*) into v_reachable from reachable;

  if v_reachable <> jsonb_array_length(v_nodes) then
    raise exception 'Every topic must have one valid parent chain ending at root' using errcode = '22023';
  end if;

  select count(*) into v_count
  from (
    select value ->> 'id'
    from jsonb_array_elements(v_edges) as e(value)
    group by value ->> 'id'
    having count(*) > 1
  ) duplicate_edges;
  if v_count > 0 then
    raise exception 'Duplicate cross-link IDs are not allowed' using errcode = '22023';
  end if;

  select count(*) into v_count
  from (
    select least(value ->> 'source', value ->> 'target'),
           greatest(value ->> 'source', value ->> 'target')
    from jsonb_array_elements(v_edges) as e(value)
    group by 1, 2
    having count(*) > 1
  ) duplicate_pairs;
  if v_count > 0 then
    raise exception 'Duplicate undirected cross-links are not allowed' using errcode = '22023';
  end if;

  for v_edge in select value from jsonb_array_elements(v_edges) as e(value) loop
    if jsonb_typeof(v_edge) <> 'object'
      or v_edge ->> 'type' <> 'cross_link'
      or jsonb_typeof(v_edge -> 'id') <> 'string'
      or char_length(btrim(v_edge ->> 'id')) not between 1 and 128
      or jsonb_typeof(v_edge -> 'source') <> 'string'
      or jsonb_typeof(v_edge -> 'target') <> 'string'
      or char_length(btrim(v_edge ->> 'source')) not between 1 and 128
      or char_length(btrim(v_edge ->> 'target')) not between 1 and 128
      or v_edge ->> 'source' = v_edge ->> 'target'
      or (v_edge ? 'label' and (
        jsonb_typeof(v_edge -> 'label') <> 'string'
        or char_length(v_edge ->> 'label') > 500
      ))
      or (v_edge ? 'style' and (
        jsonb_typeof(v_edge -> 'style') <> 'object'
        or not public.is_safe_jsonb(v_edge -> 'style')
      ))
      or not public.is_safe_jsonb(v_edge) then
      raise exception 'Cross-link structure is invalid' using errcode = '22023';
    end if;

    if not exists (
      select 1 from jsonb_array_elements(v_nodes) as n(value)
      where n.value ->> 'id' = v_edge ->> 'source'
    ) or not exists (
      select 1 from jsonb_array_elements(v_nodes) as n(value)
      where n.value ->> 'id' = v_edge ->> 'target'
    ) then
      raise exception 'Cross-link endpoint does not exist in this graph' using errcode = '22023';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(v_nodes) as n(value)
      where n.value ->> 'id' <> 'root'
        and v_edge ->> 'id' = 'hierarchy:'
          || public.encode_uri_component(n.value ->> 'parentId')
          || ':'
          || public.encode_uri_component(n.value ->> 'id')
    ) then
      raise exception 'Cross-link ID collides with a hierarchy edge ID' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create or replace function public.insert_canonical_graph_rows(
  p_map_id uuid,
  p_actor_id uuid,
  p_graph jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Root is inserted first; the recursive ordering inserts each parent before its children.
  with recursive tree(id, depth) as (
    select 'root'::text, 0
    union all
    select n.value ->> 'id', tree.depth + 1
    from jsonb_array_elements(p_graph -> 'nodes') as n(value)
    join tree on n.value ->> 'parentId' = tree.id
    where n.value ->> 'id' <> 'root'
  )
  insert into public.topics (
    id, map_id, parent_id, title, notes, position_x, position_y,
    sort_key, style, metadata, created_by
  )
  select
    n.value ->> 'id',
    p_map_id,
    case when n.value ->> 'id' = 'root' then null else n.value ->> 'parentId' end,
    n.value -> 'data' ->> 'label',
    coalesce(n.value -> 'data' ->> 'notes', ''),
    (n.value -> 'position' ->> 'x')::double precision,
    (n.value -> 'position' ->> 'y')::double precision,
    n.ordinality::numeric,
    coalesce(n.value -> 'style', '{}'::jsonb),
    coalesce(n.value -> 'data' - 'label' - 'notes', '{}'::jsonb),
    p_actor_id
  from jsonb_array_elements(p_graph -> 'nodes') with ordinality as n(value, ordinality)
  join tree on tree.id = n.value ->> 'id'
  order by tree.depth, n.ordinality;

  insert into public.map_edges (
    id, map_id, source_topic_id, target_topic_id, edge_type, label, style, created_by
  )
  select
    e.value ->> 'id',
    p_map_id,
    e.value ->> 'source',
    e.value ->> 'target',
    'cross_link',
    coalesce(e.value ->> 'label', ''),
    coalesce(e.value -> 'style', '{}'::jsonb),
    p_actor_id
  from jsonb_array_elements(p_graph -> 'edges') as e(value);
end;
$$;

create or replace function public.create_map_with_graph(
  p_workspace_id uuid,
  p_request_id uuid,
  p_document jsonb,
  p_description text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_payload_hash text;
  v_existing public.map_write_requests%rowtype;
  v_map_id uuid;
  v_snapshot_id uuid := gen_random_uuid();
  v_response jsonb;
  v_graph jsonb;
  v_title text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_workspace_id is null or p_request_id is null
    or coalesce(length(p_description), 0) > 10000 then
    raise exception 'Map creation request is invalid' using errcode = '22023';
  end if;
  if not public.has_workspace_role(p_workspace_id, array['owner', 'admin', 'editor']) then
    raise exception 'Workspace is not accessible for map creation' using errcode = '42501';
  end if;

  v_payload_hash := encode(
    extensions.digest(
      convert_to(jsonb_build_object(
        'workspaceId', p_workspace_id,
        'description', coalesce(p_description, ''),
        'document', p_document
      )::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(hashtextextended(
    p_workspace_id::text || ':' || v_actor_id::text || ':' || p_request_id::text,
    0
  ));

  select * into v_existing
  from public.map_write_requests r
  where r.workspace_id = p_workspace_id
    and r.actor_user_id = v_actor_id
    and r.request_id = p_request_id
  for update;

  if found then
    if v_existing.payload_hash <> v_payload_hash then
      raise exception 'Idempotency key was already used with a different payload' using errcode = '23505';
    end if;
    return v_existing.response;
  end if;

  perform public.assert_canonical_graph_document(p_document);
  v_graph := p_document -> 'graph';
  v_title := v_graph ->> 'title';

  insert into public.maps (workspace_id, title, description, schema_version, revision, created_by)
  values (p_workspace_id, v_title, coalesce(p_description, ''), 2, 0, v_actor_id)
  returning id into v_map_id;

  perform public.insert_canonical_graph_rows(v_map_id, v_actor_id, v_graph);

  update public.maps
  set revision = 1, updated_at = now()
  where id = v_map_id;

  insert into public.map_revisions (id, map_id, revision, schema_version, snapshot, created_by, note)
  values (v_snapshot_id, v_map_id, 1, 2, p_document, v_actor_id, 'Initial graph');

  insert into public.audit_events (
    workspace_id, actor_user_id, action, resource_type, resource_id, request_id, details
  )
  values (
    p_workspace_id, v_actor_id, 'map.created', 'map', v_map_id, p_request_id::text,
    jsonb_build_object(
      'revision', 1,
      'topicCount', jsonb_array_length(v_graph -> 'nodes'),
      'crossLinkCount', jsonb_array_length(v_graph -> 'edges')
    )
  );

  v_response := jsonb_build_object(
    'mapId', v_map_id,
    'revision', 1,
    'snapshotId', v_snapshot_id,
    'requestId', p_request_id
  );

  insert into public.map_write_requests (
    workspace_id, actor_user_id, request_id, map_id, payload_hash, result_revision, response
  )
  values (p_workspace_id, v_actor_id, p_request_id, v_map_id, v_payload_hash, 1, v_response);

  return v_response;
end;
$$;

create or replace function public.commit_map_graph(
  p_map_id uuid,
  p_expected_revision integer,
  p_request_id uuid,
  p_document jsonb,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_workspace_id uuid;
  v_current_revision integer;
  v_payload_hash text;
  v_existing public.map_write_requests%rowtype;
  v_snapshot_id uuid := gen_random_uuid();
  v_next_revision integer;
  v_response jsonb;
  v_graph jsonb;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_map_id is null or p_request_id is null or p_expected_revision < 0
    or coalesce(length(p_note), 0) > 1000 then
    raise exception 'Graph commit request is invalid' using errcode = '22023';
  end if;

  select m.workspace_id, m.revision
  into v_workspace_id, v_current_revision
  from public.maps m
  where m.id = p_map_id and m.deleted_at is null
  for update;

  if not found then
    raise exception 'Map is not accessible' using errcode = '42501';
  end if;
  if not public.has_workspace_role(v_workspace_id, array['owner', 'admin', 'editor']) then
    raise exception 'Workspace is not accessible for graph mutation' using errcode = '42501';
  end if;

  v_payload_hash := encode(
    extensions.digest(
      convert_to(jsonb_build_object(
        'mapId', p_map_id,
        'expectedRevision', p_expected_revision,
        'note', coalesce(p_note, ''),
        'document', p_document
      )::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(hashtextextended(
    v_workspace_id::text || ':' || v_actor_id::text || ':' || p_request_id::text,
    0
  ));

  select * into v_existing
  from public.map_write_requests r
  where r.workspace_id = v_workspace_id
    and r.actor_user_id = v_actor_id
    and r.request_id = p_request_id
  for update;

  if found then
    if v_existing.payload_hash <> v_payload_hash or v_existing.map_id <> p_map_id then
      raise exception 'Idempotency key was already used with a different payload' using errcode = '23505';
    end if;
    return v_existing.response;
  end if;

  if p_expected_revision <> v_current_revision then
    raise exception 'Map revision conflict' using errcode = '40001';
  end if;

  perform public.assert_canonical_graph_document(p_document);
  v_graph := p_document -> 'graph';
  v_next_revision := v_current_revision + 1;

  delete from public.map_edges where map_id = p_map_id;
  delete from public.topics where map_id = p_map_id;

  perform public.insert_canonical_graph_rows(p_map_id, v_actor_id, v_graph);

  update public.maps
  set title = v_graph ->> 'title',
      schema_version = 2,
      revision = v_next_revision,
      updated_at = now()
  where id = p_map_id;

  insert into public.map_revisions (id, map_id, revision, schema_version, snapshot, created_by, note)
  values (v_snapshot_id, p_map_id, v_next_revision, 2, p_document, v_actor_id, coalesce(p_note, ''));

  insert into public.audit_events (
    workspace_id, actor_user_id, action, resource_type, resource_id, request_id, details
  )
  values (
    v_workspace_id, v_actor_id, 'map.graph_committed', 'map', p_map_id, p_request_id::text,
    jsonb_build_object(
      'revision', v_next_revision,
      'topicCount', jsonb_array_length(v_graph -> 'nodes'),
      'crossLinkCount', jsonb_array_length(v_graph -> 'edges')
    )
  );

  v_response := jsonb_build_object(
    'mapId', p_map_id,
    'revision', v_next_revision,
    'snapshotId', v_snapshot_id,
    'requestId', p_request_id
  );

  insert into public.map_write_requests (
    workspace_id, actor_user_id, request_id, map_id, payload_hash, result_revision, response
  )
  values (
    v_workspace_id, v_actor_id, p_request_id, p_map_id, v_payload_hash, v_next_revision, v_response
  );

  return v_response;
end;
$$;

revoke all on function public.is_safe_jsonb(jsonb, integer) from public, anon, authenticated;
revoke all on function public.encode_uri_component(text) from public, anon, authenticated;
revoke all on function public.assert_canonical_graph_document(jsonb) from public, anon, authenticated;
revoke all on function public.insert_canonical_graph_rows(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.create_map_with_graph(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.commit_map_graph(uuid, integer, uuid, jsonb, text) from public, anon, authenticated;

grant execute on function public.create_map_with_graph(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.commit_map_graph(uuid, integer, uuid, jsonb, text) to authenticated;

commit;
