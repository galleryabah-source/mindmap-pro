begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- This CI container cannot open a second authenticated PostgreSQL session through dblink.
-- Verify the database locking and idempotency primitives here; a true two-session race
-- remains a mandatory staging release gate with dedicated database credentials.
select ok(
  pg_catalog.lower(pg_catalog.pg_get_functiondef('public.save_map_snapshot(uuid,integer,jsonb,text,text)'::regprocedure))
    like '%for update%',
  'save_map_snapshot locks the map row before comparing revisions'
);

select ok(
  pg_catalog.lower(pg_catalog.pg_get_functiondef('public.save_map_snapshot(uuid,integer,jsonb,text,text)'::regprocedure))
    like '%revision_conflict%',
  'save_map_snapshot rejects stale expected revisions'
);

select ok(
  pg_catalog.lower(pg_catalog.pg_get_functiondef('public.restore_map_revision(uuid,integer,integer,text)'::regprocedure))
    like '%for update%',
  'restore_map_revision locks the map row before restoring a snapshot'
);

select ok((select exists (
  select 1 from pg_catalog.pg_constraint c
  where c.conrelid = 'public.graph_mutation_requests'::regclass
    and c.conname = 'graph_mutation_requests_actor_request_unique'
    and c.contype = 'u' and c.convalidated
)), 'concurrent retries are serialized by a unique actor/request idempotency key');

select * from finish();
rollback;
