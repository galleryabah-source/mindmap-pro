# Quality Strategy and Release Gates

## Required CI
1. Formatting/lint and TypeScript typecheck.
2. Domain unit tests for graph invariants and command reducers.
3. Clean PostgreSQL migration validation.
4. Integration tests for repositories, authorization, revisions and idempotency.
5. API contract tests.
6. Playwright E2E for create/edit/save/reload/export and tenant isolation.
7. Accessibility smoke tests for keyboard and semantic outline.
8. Dependency and secret scanning.
9. Build and container validation.

## Test layers
- Unit: cycle prevention, commands, layout and entitlement rules.
- Integration: transactions, migrations, import/export and permissions.
- E2E: onboarding, nested edits, save recovery, share revocation and restore.
- Concurrency: simultaneous edits, stale revisions and duplicate requests.
- Security: cross-tenant access, IDOR, XSS, upload abuse and rate limits.
- Performance: large map load, bulk mutations, export and save latency.
- Recovery: PostgreSQL/object restore, failed migration and worker restart.

## Release gates
- **A Foundation:** CI green, no secrets, dependency/license inventory.
- **B Editor:** invariants covered, autosave recovery verified, keyboard alternatives pass.
- **C Security:** cross-tenant negative tests, share/session controls and upload limits pass.
- **D Collaboration:** conflict protocol documented and concurrency suite passes.
- **E AI:** provenance/adversarial tests pass; budgets and timeouts enforced.
- **F Production:** restore drill, monitoring, incident runbook, privacy/legal review, rollback/forward-fix plan; no open P0/P1 security or integrity defects.

A feature is done only when domain behavior, authorization, persistence, failure handling, accessibility, telemetry, tests and documentation meet acceptance criteria.
