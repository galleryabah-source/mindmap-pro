# Security, Privacy, and Trust Model

## Threats
Cross-tenant access; leaked share links; stored XSS in imported content; malicious/oversized uploads; session theft; prompt injection in source documents; accidental AI-provider disclosure; abuse of exports/invitations/AI; dependency and secret leaks.

## Required controls
1. Default deny; authorize every action against workspace membership and resource permission.
2. Validate inputs and sanitize imported content; never execute user-provided HTML/SVG.
3. Use secure HTTP-only SameSite cookies and CSRF protections where needed.
4. Rate-limit login, share resolution, uploads, exports, invitations and AI calls.
5. Bound upload size/page count/decompression/parser time/worker memory; scan files.
6. Store secrets in deployment secret management, never Git or client bundles.
7. Hash share tokens; support expiry, revocation and least-privilege roles.
8. Audit permission changes, membership, sharing, exports and administrative actions.
9. Back up PostgreSQL and object storage; regularly test restoration.
10. Scan dependencies/container images and enable secret scanning.
11. Minimize telemetry; redact prompts, document text, tokens and personal data.
12. Publish retention, export and deletion policies appropriate to applicable law.
13. Verify AI provider data-use and retention terms before transmitting user content.
14. Enforce plan limits server-side, never only in UI.

## AI-specific
Treat source documents as untrusted input, not system instructions. Validate structured output, constrain node count/depth, and require user acceptance before modifying an existing map. Apply per-user/workspace budgets, concurrency limits, timeouts and bounded retries. Never expose provider keys to browsers.

## Release blockers
Confirmed cross-tenant access, critical injection, leaked secret, bypassable entitlement, unsafe file parser or untested recovery blocks release.
