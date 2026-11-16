-- Prepare canonical graph persistence without enabling any client write path.
-- This migration adds lossless edge metadata and a private idempotency ledger.
-- Actual graph mutations remain disabled until audited RPCs are implemented and tested.

begin;

alter table public.map_edges
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.map_edges
  drop constraint if exists map_edges_metadata_object;
alter table public.map_edges
  add constraint map_edges_metadata_object
  check (jsonb_typeof(metadata) = 'object');

create table if not exists public.graph_mutation_requests (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  request_id text not null
    check (length(btrim(request_id)) between 1 and 128),
  operation text not null
    check (operation in ('create_map', 'save_map_snapshot', 'restore_map_revision')),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  map_id uuid references public.maps(id) on delete cascade,
  payload_hash text not null
    check (payload_hash ~ '^[0-9a-f]{64}$'),
  response jsonb not null default '{}'::jsonb
    check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint graph_mutation_requests_completion_state
    check (completed_at is null or completed_at >= created_at),
  constraint graph_mutation_requests_actor_request_unique
    unique (actor_user_id, request_id)
);

create index if not exists graph_mutation_requests_workspace_created_idx
  on public.graph_mutation_requests (workspace_id, created_at desc);

create index if not exists graph_mutation_requests_map_created_idx
  on public.graph_mutation_requests (map_id, created_at desc)
  where map_id is not null;

alter table public.graph_mutation_requests enable row level security;

-- The ledger is an internal RPC implementation detail, never a browser data API.
revoke all on public.graph_mutation_requests from anon, authenticated;
revoke all on public.graph_mutation_requests from public;

commit;
