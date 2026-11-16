begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

select has_column('public', 'map_edges', 'metadata', 'cross-links have a metadata column for canonical round-trip');
select ok((select a.atttypid = 'jsonb'::regtype and a.attnotnull
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.map_edges'::regclass
    and a.attname = 'metadata' and not a.attisdropped),
  'cross-link metadata is non-null jsonb');
select ok((select pg_catalog.pg_get_expr(d.adbin, d.adrelid) like '%{}%'
  from pg_catalog.pg_attrdef d
  join pg_catalog.pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
  where d.adrelid = 'public.map_edges'::regclass and a.attname = 'metadata'),
  'cross-link metadata defaults to an empty JSON object');
select ok((select exists (
  select 1 from pg_catalog.pg_constraint c
  where c.conrelid = 'public.map_edges'::regclass
    and c.conname = 'map_edges_metadata_object'
    and c.contype = 'c' and c.convalidated
)), 'cross-link metadata is constrained to JSON objects');

select has_table('public', 'graph_mutation_requests', 'private graph mutation idempotency ledger exists');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.graph_mutation_requests'::regclass),
  'idempotency ledger has row-level security enabled');
select ok(not has_table_privilege('anon', 'public.graph_mutation_requests', 'SELECT'),
  'anonymous role cannot read idempotency ledger');
select ok(not has_table_privilege('authenticated', 'public.graph_mutation_requests', 'SELECT'),
  'authenticated role cannot read idempotency ledger');
select ok(not has_table_privilege('authenticated', 'public.graph_mutation_requests', 'INSERT'),
  'authenticated role cannot insert idempotency records directly');
select ok(not has_table_privilege('authenticated', 'public.graph_mutation_requests', 'UPDATE'),
  'authenticated role cannot update idempotency records directly');
select ok(not has_table_privilege('authenticated', 'public.graph_mutation_requests', 'DELETE'),
  'authenticated role cannot delete idempotency records directly');
select ok(not has_table_privilege('anon', 'public.graph_mutation_requests', 'INSERT'),
  'anonymous role cannot insert idempotency records');
select ok(not has_table_privilege('anon', 'public.graph_mutation_requests', 'UPDATE'),
  'anonymous role cannot update idempotency records');
select ok(not has_table_privilege('anon', 'public.graph_mutation_requests', 'DELETE'),
  'anonymous role cannot delete idempotency records');
select ok((select exists (
  select 1 from pg_catalog.pg_constraint c
  where c.conrelid = 'public.graph_mutation_requests'::regclass
    and c.conname = 'graph_mutation_requests_actor_request_unique'
    and c.contype = 'u' and c.convalidated
)), 'idempotency key is unique per authenticated actor');
select ok((select exists (
  select 1 from pg_catalog.pg_constraint c
  where c.conrelid = 'public.graph_mutation_requests'::regclass
    and c.conname = 'graph_mutation_requests_completion_state'
    and c.contype = 'c' and c.convalidated
)), 'idempotency completion timestamp is constrained');

select * from finish();
rollback;
