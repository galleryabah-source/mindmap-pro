# Graph API Contract — MindMap Pro

## Scope

This is the authenticated server API boundary for canonical graph persistence. Browser clients must not write directly to graph, revision, audit, or idempotency tables.

All private responses use Cache-Control: private, no-store, max-age=0 and Vary: Cookie, Authorization. State-changing cookie-authenticated requests require an exact same-origin Origin header. Every route verifies the Supabase session with auth.getUser(); service-role credentials are never used.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | /api/maps?workspaceId={uuid} | RLS-scoped map list |
| POST | /api/maps | Create map through create_map RPC |
| GET | /api/maps/{mapId} | Read map metadata and current immutable snapshot |
| PATCH | /api/maps/{mapId} | Save full canonical snapshot through save_map_snapshot RPC |
| GET | /api/maps/{mapId}/revisions?limit=50&before={revision} | Paginated immutable revision metadata |
| POST | /api/maps/{mapId}/restore | Restore an old snapshot as a new revision |

## Mutation request rules

- POST create, PATCH save and POST restore require Idempotency-Key (1–128 characters, no control characters).
- A retry must reuse the same key and identical payload. A new user action must use a new key.
- Save and restore require expectedRevision; stale revisions return HTTP 409 REVISION_CONFLICT.
- Graph documents are validated at the API boundary and again in PostgreSQL.
- JSON request bodies are streamed and limited to 8,000,000 bytes. The database enforces the same serialized graph size limit.
- All graph mutations execute through authenticated SECURITY DEFINER RPCs. Database authorization is authoritative; UI state is not an authorization boundary.

## Error mapping

| HTTP | Code | Meaning |
|---|---|---|
| 401 | AUTH_REQUIRED | Session is missing or invalid |
| 403 | FORBIDDEN / ORIGIN_NOT_ALLOWED | Role or origin is not authorized |
| 404 | MAP_NOT_FOUND | Map is missing or outside the caller's workspace |
| 409 | REVISION_CONFLICT / REQUEST_ID_REUSED | Stale revision or idempotency-key collision |
| 413 | PAYLOAD_TOO_LARGE | Request exceeds the body limit |
| 422 | INVALID_GRAPH / INVALID_REQUEST_ID | Request does not satisfy the contract |
| 503 | PERSISTENCE_UNAVAILABLE | Persistence service is unavailable |

Unexpected database details are never returned to clients.

## Release boundary

The API routes are implementation candidates until exact-head CI, dedicated Supabase Auth/RLS tests, API integration tests, browser UAT, backup/restore and deployment checks pass. The editor remains local-first until those gates are accepted. A successful Vercel Preview is not evidence that the hosted Supabase environment is configured.
