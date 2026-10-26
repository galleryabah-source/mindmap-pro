# Delivery Plan

## Repository
https://github.com/galleryabah-source/mindmap-pro (public repository supplied by project owner).

## Planned structure
README.md; CONTRIBUTING.md; SECURITY.md; LICENSE-DECISION.md; .gitignore; .env.example; docs/PRODUCT_REQUIREMENTS.md; docs/FEATURE_PARITY.md; docs/ARCHITECTURE.md; docs/DATA_MODEL.md; docs/API_CONTRACT.md; docs/SECURITY.md; docs/UX_ACCESSIBILITY.md; docs/AI_PIPELINE.md; docs/QUALITY_GATES.md; docs/ROADMAP.md; docs/DELIVERY_PLAN.md; docs/DECISIONS.md. Add .github/workflows/ci.yml with application bootstrap.

## Branch policy
Keep main releasable. Use short-lived feat/fix/docs branches. Require CI before merge where branch protection is configured. Keep PRs reviewable. Migrations are append-only after release; use tested rollback or forward-fix.

## First implementation issues
1. Bootstrap app, CI, env validation and health endpoint.
2. Implement identity/workspace schema and tenant authorization tests.
3. Implement canonical graph model and invariant suite.
4. Build accessible editor shell and topic operations.
5. Implement autosave, revisions and recovery tests.
6. Add JSON schema and round-trip import/export tests.
7. Build secure upload and provenance pipeline.
8. Document collaboration protocol and concurrency tests.

## Local setup target
Use Node.js LTS supported by selected Next.js release and a pinned PostgreSQL major. Document install, migration, lint, typecheck, test and build commands. Never commit .env.local.

## Public repository hygiene
Choose a license intentionally, enable secret/dependency scanning, and do not commit private documents, credentials, production data or unauthorized assets.
