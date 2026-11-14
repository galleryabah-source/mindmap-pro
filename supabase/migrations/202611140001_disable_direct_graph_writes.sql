-- Disable direct client mutations of canonical graph tables until audited RPC persistence is available.
-- Reads remain available through RLS. Future graph writes must pass through atomic, revision-checked RPCs.
begin;
revoke insert, update, delete on public.maps, public.topics, public.map_edges from anon, authenticated;
commit;
