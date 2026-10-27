# MindMap Pro — Unified System Hardening and Execution Plan

**Status:** execution plan; not evidence that any gate has passed.
**Scope:** consolidate the product blueprint, implementation branch, CI gates, database decision, and Cloudflare preview into one controlled delivery sequence.

## Operating principles

1. One canonical graph/domain model; UI, persistence, import/export, templates, AI, collaboration, and presentation must use the same validated commands and graph invariants.
2. PostgreSQL remains the canonical database in the current ADR until a reviewed decision explicitly changes it. Do not mix PostgreSQL migrations/Supabase helpers with D1/SQLite.
3. Never provision, modify, or delete an unrelated database or paid Cloudflare resource without explicit approval.
4. A written plan, successful dependency installation, or a provider build comment is not proof of a working deployment. Record commit SHA, test evidence, and preview URL for each gate.
5. Keep the main branch releasable. No merge or production-readiness claim while critical security, authorization, persistence, or recovery gates are open.

## Current known blockers (as last inspected)

- PR #1 (`feat/web-app-foundation`) is still draft.
- GitHub Actions runs #67 and #68 failed at `npm audit --audit-level=high`; later lint, typecheck, tests, and build were skipped. These runs do not prove the Supabase proxy fix passes typecheck.
- `package.json` pins `vitest@3.2.7`; the repository did not have a committed lockfile at the last inspection.
- The first PostgreSQL migration has not been validated against a dedicated MindMap Pro database.
- Draft persistence is browser/device-local; cloud persistence and cross-device sync are not implemented.
- Cloudflare bot comments show failed builds for commits on PR #1 and PR #3. The actual build logs must be read before changing runtime configuration.
- No Neon project named MindMap Pro was identified in the accessible project list. Do not assume another project belongs to this app.
- PR #3 is a documentation/planning PR, not proof of a deployed Worker.

## Gate 1 — CI and dependency integrity (P0)

1. Inspect the full npm audit report and identify fixed compatible versions for the vulnerable dependency tree.
2. Upgrade dependencies only through a reviewed, reproducible change; do not bypass the audit with `--force` or ignore the failing audit.
3. Generate and commit a real `package-lock.json` from the chosen Node/npm toolchain; do not hand-author lockfile contents.
4. Change CI to `npm ci` only in the same change that includes a valid lockfile.
5. Run lint, TypeScript, unit tests, and production build. Confirm all results correspond to the same commit SHA.
6. Add secret/dependency scanning as a release gate where available.

**Exit evidence:** dependency audit passes at the configured threshold, lockfile is committed, and all CI steps pass on the current PR head.

## Gate 2 — Runtime/database architecture decision (P0)

Current accepted ADR-008 baseline: GitHub + Cloudflare edge services + Supabase PostgreSQL, with the Next.js application on a compatible Node.js runtime. A Cloudflare Workers runtime is not assumed to be a drop-in replacement.

Before implementation, compare:
- **Option A:** Cloudflare Workers/compatible Next.js adapter plus PostgreSQL (Neon or Supabase), after verifying server runtime, auth/session, database driver/connection behavior, and required packages.
- **Option B:** Cloudflare Workers + D1, which requires a distinct SQLite/D1 adapter and migrations. PostgreSQL SQL and Supabase helpers must not be reused unchanged.

Inspect the failed Cloudflare build logs and run the official compatibility check before selecting a runtime. Keep the existing Node.js development path working. Record the final choice and rollback path in an accepted ADR.

**Exit evidence:** one runtime and one database strategy are documented; no incompatible provider APIs or migrations are mixed.

## Gate 3 — Database foundation and tenant security (P0)

1. Use a dedicated MindMap Pro database/branch only after confirming the intended provider and account access.
2. Run migrations from an empty database on the selected PostgreSQL major version.
3. Test foreign keys, deterministic sibling order, parent-map consistency, cycle prevention, immutable revisions, and transactional graph commands.
4. Verify workspace membership authorization on every read/write and RLS policies where applicable.
5. Add negative tests proving a user in workspace A cannot read or mutate workspace B.
6. Verify safe environment handling; never commit real secrets.

**Exit evidence:** clean migration succeeds and integration tests prove tenant isolation and graph invariants.

## Gate 4 — Canonical application service and persistence (P0)

Use one application-owned command boundary for graph mutations. UI components must not write provider-specific data directly.

Implement/verify:
- authenticated workspace and map creation/list/read/update/archive;
- stable UUID topic identity, explicit parent hierarchy and separate cross-links;
- validated commands with command IDs, base revision, idempotency, and stale-revision conflict handling;
- transactionally consistent graph mutation and immutable revision creation;
- autosave pending/saved/error state, retry, and recoverable local draft;
- import flow: validate → preview → commit; export round-trip validation;
- server authorization before resource access, not only client-side hiding.

**Exit evidence:** create/edit/move/nest/undo/redo/save/reload/import/export flows pass integration and browser E2E tests without silent data loss.

## Gate 5 — Cloudflare preview (P0)

1. Read build logs associated with the failed deployment comments on PR #1 and PR #3.
2. Validate the chosen runtime and adapter against the actual app.
3. Add Worker-specific configuration on an isolated branch and preserve existing CI.
4. Check existing account plan/quotas before creating only the approved MindMap Pro preview resource.
5. Configure secrets through the authenticated Cloudflare dashboard/CLI; never commit tokens or `.dev.vars`.
6. Deploy to `workers.dev` and record the exact preview URL and deployed commit.
7. Test sign-in/session, create/edit map, save/reload, unauthorized access, import/export, error handling, and mobile editor behavior.

**Exit evidence:** successful build/deployment with a real preview URL and recorded smoke-test evidence. A bot comment alone is insufficient.

## Gate 6 — Release and operating readiness

Before merging/releasing:
- review final diff and CI results on the exact head SHA;
- run migration, API contract, tenant isolation, accessibility, and core E2E tests;
- define backup/restore and migration rollback/forward-fix procedures;
- ensure authenticated responses are not publicly cached;
- verify logs redact user content, tokens, and secrets;
- document the known limitations and deployment/recovery procedure.

**Exit evidence:** no open P0/P1 security or integrity defects, a successful restore drill, and reproducible deployment instructions.

## Post-foundation roadmap

Only after the web foundation passes:
1. Premium UX, keyboard navigation, search, history, templates, and export.
2. Secure document extraction and AI draft generation with source provenance and explicit user acceptance.
3. Sharing and collaboration with roles, revocable links, and tested concurrency semantics.
4. Presentation and task planning.
5. Production operations, then Android and Windows shells once shared domain/API contracts are stable.

## Immediate next actions

1. Resolve the dependency audit without bypassing the security gate.
2. Commit a real lockfile and make CI deterministic.
3. Read the failed Cloudflare build logs and run runtime compatibility validation.
4. Accept a single database/runtime ADR before provisioning anything.
5. Validate migrations and tenant authorization in a dedicated isolated database.
6. Implement server persistence and recovery, then prove the core editor flows.
7. Deploy and test a Cloudflare preview only after the preceding gates are met.

This document is a plan and must be updated with commit SHAs, run URLs, migration evidence, and preview URL as work is completed.