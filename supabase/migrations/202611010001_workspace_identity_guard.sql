-- MindMap Pro: protect immutable workspace identity fields.
-- Additive hardening migration; does not rewrite the initial schema migration.

begin;

drop trigger if exists workspaces_guard_identity on public.workspaces;

create trigger workspaces_guard_identity
before update on public.workspaces
for each row
execute function public.guard_immutable_identity('id', 'created_by', 'created_at');

comment on trigger workspaces_guard_identity on public.workspaces is
  'Prevents reassignment of canonical workspace identity and creator metadata.';

commit;
