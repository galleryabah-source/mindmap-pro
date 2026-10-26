# API Contract

## Conventions
JSON over HTTPS under /api/v1. Validate inputs server-side. Authorize every resource; never trust client-supplied workspace IDs. Use request IDs, cursor pagination and idempotency keys for relevant mutations. Never expose stack traces, tokens or private content in errors.

## Initial endpoints
| Method | Route | Purpose |
|---|---|---|
| GET | /api/v1/me | Current user and memberships |
| GET/POST | /api/v1/workspaces | List/create workspaces |
| GET/POST | /api/v1/workspaces/:id/maps | List/create maps |
| GET/PATCH/DELETE | /api/v1/maps/:id | Read/update/archive map |
| GET | /api/v1/maps/:id/graph | Read graph |
| POST | /api/v1/maps/:id/commands | Apply validated editor command |
| GET/POST | /api/v1/maps/:id/revisions | List/create revision |
| POST | /api/v1/maps/:id/revisions/:revisionId/restore | Restore as new revision |
| POST | /api/v1/maps/:id/imports | Start import |
| GET | /api/v1/imports/:id | Import status |
| POST | /api/v1/maps/:id/exports | Start export |
| POST | /api/v1/maps/:id/share-links | Create share link |
| DELETE | /api/v1/share-links/:id | Revoke share link |
| POST | /api/v1/maps/:id/ai-jobs | Start AI draft |
| GET | /api/v1/ai-jobs/:id | AI job status/result |
| POST | /api/v1/maps/:id/comments | Add comment |

## Command envelope
```json
{
  "commandId": "uuid",
  "baseRevision": 12,
  "type": "topic.move",
  "payload": {
    "topicId": "uuid",
    "newParentId": "uuid-or-null",
    "beforeTopicId": "uuid-or-null"
  }
}
```
The domain service validates the command. A stale baseRevision can return REVISION_CONFLICT; it must never silently overwrite newer edits.

## Error codes
AUTHENTICATION_REQUIRED, FORBIDDEN, NOT_FOUND, VALIDATION_FAILED, REVISION_CONFLICT, IDEMPOTENCY_CONFLICT, QUOTA_EXCEEDED, IMPORT_UNSUPPORTED, FILE_SCAN_PENDING, FILE_REJECTED, JOB_FAILED, RATE_LIMITED.

## Contract tests
Verify schemas, status codes, authorization, idempotency, stale revision behavior and absence of sensitive details in errors.
