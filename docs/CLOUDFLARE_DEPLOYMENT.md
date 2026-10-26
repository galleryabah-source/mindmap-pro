# Cloudflare Deployment Plan — MindMap Pro

Status: preparation only. No Cloudflare resource has been created and no deployment has occurred.

Use the existing Cloudflare account and the free workers.dev hostname for the first preview. Do not buy a custom domain or enable paid services without explicit approval.

The current app is Next.js 16 / React 19 / TypeScript. The feature branch includes Supabase SSR helpers and a PostgreSQL migration, but the migration has not been validated against a hosted database. Browser-local drafts are device-specific and are not cloud backup.

Cloudflare's current guide recommends vinext as the default Next.js-on-Workers path, but vinext is beta. Run the compatibility check before adopting it and keep the existing Next.js workflow intact until tests pass: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

D1 is SQLite-based, not PostgreSQL. If we choose an all-Cloudflare database, the existing PostgreSQL migration and Supabase helpers must not be used unchanged. Create a separate D1 adapter and D1 migrations, then test tenant authorization, revisions, concurrency, import/export, and recovery.

Cost and limits must be checked in the account before creating resources:
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- D1 limits: https://developers.cloudflare.com/d1/platform/limits/

Implementation gates:
1. Run and review vinext compatibility checks.
2. Decide D1 versus a separately hosted PostgreSQL service.
3. Add Cloudflare preview/build configuration on an isolated branch.
4. Create only MindMap Pro resources, after confirming account plan/quota.
5. Deploy to workers.dev and test the editor, auth, persistence, and recovery.

Current blocker: the connected tools do not expose authenticated Cloudflare resource management. Repository preparation can proceed, but Worker creation, database bindings, secrets, and deployment require an authenticated Cloudflare dashboard or CLI session.