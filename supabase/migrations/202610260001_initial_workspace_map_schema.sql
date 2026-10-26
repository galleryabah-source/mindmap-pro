-- MindMap Pro: initial canonical workspace/map schema.
-- Apply only to a dedicated MindMap Pro Supabase project after reviewing the target project.
-- This migration intentionally does not touch any existing Supabase project automatically.

begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_workspace_idx
  on public.workspace_members (user_id, workspace_id);

create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null default 'Untitled mind map' check (length(trim(title)) between 1 and 240),
  description text not null default '' check (length(description) <= 10000),
  schema_version integer not null default 1 check (schema_version > 0),
  revision integer not null default 0 check (revision >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists maps_workspace_updated_idx
  on public.maps (workspace_id, updated_at desc)
  where deleted_at is null;

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  parent_id uuid,
  title text not null default '' check (length(title) <= 2000),
  notes text not null default '' check (length(notes) <= 50000),
  position_x double precision not null default 0 check (position_x between -10000000 and 10000000),
  position_y double precision not null default 0 check (position_y between -10000000 and 10000000),
  sort_key numeric not null default 0,
  style jsonb not null default '{}'::jsonb check (jsonb_typeof(style) = 'object'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topics_id_map_unique unique (id, map_id),
  constraint topics_no_self_parent check (parent_id is null or parent_id <> id),
  constraint topics_parent_same_map_fk
    foreign key (parent_id, map_id)
    references public.topics (id, map_id)
    on delete cascade
    deferrable initially deferred
);

create index if not exists topics_map_parent_order_idx
  on public.topics (map_id, parent_id, sort_key, id);

create table if not exists public.map_edges (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  source_topic_id uuid not null,
  target_topic_id uuid not null,
  edge_type text not null default 'hierarchy' check (edge_type in ('hierarchy', 'cross_link')),
  label text not null default '' check (length(label) <= 500),
  style jsonb not null default '{}'::jsonb check (jsonb_typeof(style) = 'object'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint map_edges_no_self_link check (source_topic_id <> target_topic_id),
  constraint map_edges_source_same_map_fk
    foreign key (source_topic_id, map_id)
    references public.topics (id, map_id)
    on delete cascade
    deferrable initially deferred,
  constraint map_edges_target_same_map_fk
    foreign key (target_topic_id, map_id)
    references public.topics (id, map_id)
    on delete cascade
    deferrable initially deferred,
  constraint map_edges_unique unique (map_id, source_topic_id, target_topic_id, edge_type)
);

create index if not exists map_edges_map_source_idx on public.map_edges (map_id, source_topic_id);
create index if not exists map_edges_map_target_idx on public.map_edges (map_id, target_topic_id);

create table if not exists public.map_revisions (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  revision integer not null check (revision > 0),
  schema_version integer not null default 1 check (schema_version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  note text not null default '' check (length(note) <= 1000),
  unique (map_id, revision)
);

create index if not exists map_revisions_map_created_idx
  on public.map_revisions (map_id, created_at desc);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (length(action) between 1 and 120),
  resource_type text not null check (length(resource_type) between 1 and 80),
  resource_id uuid,
  request_id text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists audit_events_workspace_created_idx
  on public.audit_events (workspace_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists maps_set_updated_at on public.maps;
create trigger maps_set_updated_at before update on public.maps
for each row execute function public.set_updated_at();

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at before update on public.topics
for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role(p_workspace_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role = any (p_roles)
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid, text[]) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;

create or replace function public.create_workspace(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(v_name) not between 1 and 120 then
    raise exception 'Workspace name must contain 1 to 120 characters' using errcode = '22023';
  end if;
  if length(v_slug) not between 1 and 80 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Workspace slug is invalid' using errcode = '22023';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (v_name, v_slug, v_user_id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  insert into public.audit_events (workspace_id, actor_user_id, action, resource_type, resource_id)
  values (v_workspace_id, v_user_id, 'workspace.created', 'workspace', v_workspace_id);

  return v_workspace_id;
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
grant execute on function public.create_workspace(text, text) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.maps enable row level security;
alter table public.topics enable row level security;
alter table public.map_edges enable row level security;
alter table public.map_revisions enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
for select to authenticated
using (public.is_workspace_member(id));

drop policy if exists workspaces_update_admin on public.workspaces;
create policy workspaces_update_admin on public.workspaces
for update to authenticated
using (public.has_workspace_role(id, array['owner', 'admin']))
with check (public.has_workspace_role(id, array['owner', 'admin']));

drop policy if exists workspace_members_select_same_workspace on public.workspace_members;
create policy workspace_members_select_same_workspace on public.workspace_members
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists maps_select_member on public.maps;
create policy maps_select_member on public.maps
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists maps_insert_editor on public.maps;
create policy maps_insert_editor on public.maps
for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']) and created_by = (select auth.uid()));

drop policy if exists maps_update_editor on public.maps;
create policy maps_update_editor on public.maps
for update to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));

drop policy if exists maps_delete_admin on public.maps;
create policy maps_delete_admin on public.maps
for delete to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

drop policy if exists topics_select_member on public.topics;
create policy topics_select_member on public.topics
for select to authenticated
using (exists (select 1 from public.maps m where m.id = map_id and public.is_workspace_member(m.workspace_id)));

drop policy if exists topics_insert_editor on public.topics;
create policy topics_insert_editor on public.topics
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (select 1 from public.maps m where m.id = map_id and public.has_workspace_role(m.workspace_id, array['owner', 'admin', 'editor']))
);

drop policy if exists topics_update_editor on public.topics;
create policy topics_update_editor on public.topics
for update to authenticated
using (exists (select 1 from public.maps m where m.id = map_id and public.has_workspace_role(m.workspace_id, array['owner', 'admin', 'editor'])))
with check (exists (select 1 from public.maps m where m.id = map_id and public.has_workspace_role(m.workspace_id, array['owner', 'admin', 'editor'])));

drop policy if exists topics_delete_editor on public.topics;
create policy topics_delete_editor on public.topics
for delete to authenticated
using (exists (select 1 from public.maps m where m.id = map_id and public.has_workspace_role(m.workspace_id, array['owner', 'admin', 'editor'])));

drop policy if exists map_edges_select_member on public.map_edges;
create policy map_edges_select_member on public.map_edges
for select to authenticated
using (exists (select 1 from public.maps m where m.id = map_id and public.is_workspace_member(m.workspace_id)));

drop policy if exists map_edges_insert_editor on public.map_edges;
create policy map_edges_insert_editor on public.map_edges
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (select 1 from public.maps m where m.id = map_id and public.has_workspace_role(m.workspace_id, array['owner', 'admin', 'editor']))
);

drop policy if exists map_edges_update_editor on public.map_edges;
create policy map_edges_update_editor on public.map_edges
for update to authenticated
using (exists (select 1 from public.maps m where m.id = map_id and public.has_workspace_role(m.workspace_id, array['owner', 'admin', 'editor'])))
with check (exists (select 1 from public.maps m where m.id = map_id and public.has_workspace_role(m.workspace_id, array['owner', 'admin', 'editor'])));

drop policy if exists map_edges_delete_editor on public.map_edges;
create policy map_edges_delete_editor on public.map_edges
for delete to authenticated
using (exists (select 1 from public.maps m where m.id = map_id and public.has_workspace_role(m.workspace_id, array['owner', 'admin', 'editor'])));

drop policy if exists map_revisions_select_member on public.map_revisions;
create policy map_revisions_select_member on public.map_revisions
for select to authenticated
using (exists (select 1 from public.maps m where m.id = map_id and public.is_workspace_member(m.workspace_id)));

-- Immutable revisions: no direct UPDATE or DELETE policy is intentionally granted.
drop policy if exists audit_events_select_admin on public.audit_events;
create policy audit_events_select_admin on public.audit_events
for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- No client INSERT/UPDATE/DELETE policies for audit_events.
-- The create_workspace RPC is security-definer and writes its own audit record.

revoke all on public.workspaces, public.workspace_members, public.maps, public.topics,
  public.map_edges, public.map_revisions, public.audit_events from anon, authenticated;

grant select, update on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select, insert, update, delete on public.maps to authenticated;
grant select, insert, update, delete on public.topics to authenticated;
grant select, insert, update, delete on public.map_edges to authenticated;
grant select on public.map_revisions to authenticated;
grant select on public.audit_events to authenticated;

commit;
