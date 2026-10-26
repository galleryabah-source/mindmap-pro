# Cloudflare Deployment Plan — MindMap Pro

**Status:** preparation only. No Cloudflare resource has been created and no deployment has occurred.

## Owner-approved direction

- Use the existing Cloudflare account.
- Start without a custom domain; use the account's `workers.dev` hostname for the initial preview.
- Do not purchase a domain, enable paid services, or change unrelated resources without explicit approval.

## Current application constraints

The implementation branch is a Next.js 16 / React 19 / TypeScript application. It includes Supabase SSR helpers and a PostgreSQL migration, but that migration has not been validated against a dedicated hosted database. Browser-local drafts are device-specific and are not cloud backup.

## Runtime decision

Cloudflare's current guide recommends vinext as the default path for Next.js on Workers, but vinext is beta. Run its compatibility check against the existing application before switching, and keep the current Next.js development path intact until the Cloudflare preview and regression checks pass.

Official guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

## Database decision gate

D1 is SQLite-based, not PostgreSQL. If MindMap Pro is to use an all-Cloudflare database, the current PostgreSQL migration and Supabase helpers must not be reused unchanged. Build a dedicated D1 data-access adapter and D1 migrations, then test tenant authorization, revisions, concurrency, import/export, and recovery. Alternatively, retain PostgreSQL on a separately hosted service and use Cloudflare for the application runtime and edge delivery.

Check current plan limits and actual account usage before creating resources:
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- D1 limits: https://developers.cloudflare.com/d1/platform/limits/

## Implementation gates

1. Run and review the vinext compatibility check against the current feature branch.
2. Choose D1 or separately hosted PostgreSQL explicitly; do not silently translate PostgreSQL SQL into SQLite.
3. Add Cloudflare build/preview configuration on an isolated branch and preserve existing CI checks.
4. Confirm account plan and quota before creating only MindMap Pro resources.
5. Deploy a preview to `workers.dev`; test editor operations, authentication, persistence, and recovery.
6. Do not claim production readiness until server persistence, authorization, backup/recovery, and regression gates pass.

## Current blocker

The connected toolset does not provide authenticated Cloudflare resource management. Repository preparation can proceed, but creating a Worker, binding a database, setting secrets, and deploying requires an authenticated Cloudflare dashboard or CLI session. Never commit account tokens, session secrets, database credentials, or `.dev.vars` files.
