# UI-02 Browser UAT Checklist

Status: **Prepared; execution requires a reachable preview deployment and a configured test Supabase environment.**

This checklist validates UI-02A/B/C/D as one user-facing application shell. It is an acceptance instrument, not evidence that any test has already passed.

## 1. Preconditions

- [ ] Test the exact commit intended for acceptance; record the full commit SHA and preview URL.
- [ ] Confirm the preview build is deployed and reports healthy responses.
- [ ] Configure Supabase Auth Site URL and allowed redirect URLs for the preview origin.
- [ ] Apply the intended database migrations in the isolated test environment.
- [ ] Verify workspace RLS policies and `create_workspace` RPC permissions using non-service-role client requests.
- [ ] Prepare one confirmed test account with no workspace and one with at least one workspace.
- [ ] Use non-production test data; do not use real user credentials.
- [ ] Keep browser console, network failures and screenshots available as evidence.

If a precondition is unavailable, mark dependent cases **BLOCKED**, not PASS.

## 2. Route and session matrix

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| U02-001 | Existing editor route | Open `/` signed out | Existing editor loads; no redirect loop; local draft workflow remains available |
| U02-002 | Dashboard signed out | Open `/dashboard` without a session | Clear signed-out state and working sign-in entry; no private workspace data |
| U02-003 | Login page | Open `/login`; submit valid test credentials | Validation is clear; success follows configured confirmation/session flow |
| U02-004 | Invalid login | Submit invalid credentials | Safe error; no secret or provider internals disclosed |
| U02-005 | Auth callback | Complete configured email confirmation | Callback exchanges the code and establishes a session; no open redirect |
| U02-006 | Session persistence | Reload dashboard after sign-in | Server-verified session remains valid; identity is not taken from client input |
| U02-007 | Sign-out | Use account menu sign-out | Session is cleared; protected workspace data is no longer rendered |
| U02-008 | Expired/invalid session | Revoke or expire test session, then reload | User receives signed-out/re-authentication state; no stale private content |

## 3. Workspace authorization and data matrix

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| U02-101 | Empty workspace list | Sign in as account with no memberships | Honest empty state and create-workspace action |
| U02-102 | Existing memberships | Sign in as account with a workspace | Only memberships authorized by server/RLS are shown |
| U02-103 | Create workspace | Submit a valid workspace name | One workspace is created; result appears from a fresh authorized read |
| U02-104 | Duplicate/retry submit | Double-click or retry create request | No duplicate workspace from one logical submission; errors are safe and recoverable |
| U02-105 | Invalid payload | Submit blank/oversized/malformed input | Validation rejects request; no partial workspace created |
| U02-106 | Cross-tenant isolation | Attempt to request another user's workspace ID | Request is denied; no existence or data leakage |
| U02-107 | Unauthenticated API | Call workspace GET/POST without session | API returns the documented unauthenticated response |
| U02-108 | Database/RPC failure | Simulate unavailable DB or RPC failure | Recoverable error state; no fabricated success or stale data |

## 4. Account menu and navigation

- [ ] Account identity matches the authenticated test account returned by server session verification.
- [ ] Signed-out navigation exposes sign-in, not a fabricated profile.
- [ ] Sign-out is a real Supabase Auth action and returns the UI to signed-out state.
- [ ] Every visible navigation link resolves to an implemented route.
- [ ] Unimplemented destinations are hidden or explicitly disabled; no dead-end clickable controls.
- [ ] Active navigation state matches the current route.
- [ ] Menu opens/closes by pointer and keyboard; Escape closes it where applicable.
- [ ] Focus is visible and returns to the trigger after menu dismissal.
- [ ] No client-side role, plan, quota or workspace ID is treated as authorization.

## 5. Responsive viewport matrix

Test at the exact viewport sizes below; record browser/device and screenshots.

| Viewport | Expected checks |
|---|---|
| 320 × 720 | No horizontal page overflow; primary actions remain reachable; text and controls do not overlap |
| 390 × 844 | Mobile navigation and account entry remain usable; drawer/sheet does not cover essential actions |
| 768 × 1024 | Tablet navigation collapses predictably; content retains readable width |
| 1024 × 768 | Sidebar/header transitions cleanly; no clipped workspace content |
| 1440 × 900 | Desktop shell alignment, spacing and content hierarchy are consistent |

For each viewport:
- [ ] No horizontal scrollbar caused by the shell.
- [ ] No clipped text, overlapping controls or inaccessible action.
- [ ] Touch targets are practical on touch devices.
- [ ] Sidebar collapse/expand does not lose route state.
- [ ] Light and dark themes remain legible.

## 6. Accessibility and interaction

- [ ] Complete primary flows using keyboard only (Tab, Shift+Tab, Enter, Space, Escape).
- [ ] Landmarks and heading hierarchy are meaningful.
- [ ] Every icon-only control has an accessible name.
- [ ] Focus indicator is visible in light and dark themes.
- [ ] Form controls have programmatic labels and understandable validation messages.
- [ ] Dialog/drawer focus behavior is correct if modal navigation is used.
- [ ] Reduced-motion preference is respected.
- [ ] No critical accessibility errors are present in browser inspection.

## 7. Editor non-regression checks

UI-02 must not alter the canonical editor lifecycle. On `/`:
- [ ] Create, rename, move and delete a topic.
- [ ] Add a cross-link and confirm hierarchy edges remain distinct.
- [ ] Undo and redo accepted changes.
- [ ] Reload and verify local draft restoration.
- [ ] Import valid JSON and export; verify round-trip document integrity.
- [ ] Import malformed JSON; current draft remains intact.
- [ ] Simulate local storage failure/quota error where practical; original draft/recovery behavior remains safe.
- [ ] Confirm no migration/rename/removal of local draft keys.
- [ ] Confirm no cloud-sync or sharing behavior is implied by local-only state.

## 8. Evidence record

For every case, record:

| Field | Value |
|---|---|
| UAT date/time (UTC) | |
| Tester | |
| PR and exact commit SHA | |
| Preview URL | |
| Browser and version | |
| Device/OS | |
| Viewport | |
| Test ID | |
| Result (PASS / FAIL / BLOCKED) | |
| Evidence link or screenshot name | |
| Console/network errors | |
| Defect reference | |

A test is **PASS** only when the expected result is observed on the recorded exact commit. A skipped test, unavailable preview, missing Supabase configuration or unverified database behavior is **BLOCKED**.

## 9. Release gate

UI-02 may be accepted only when:

1. All applicable route, session, workspace authorization and account-menu cases pass.
2. Responsive and accessibility checks pass at the listed breakpoints.
3. Editor non-regression checks pass.
4. Exact-head CI is green for all stacked PRs.
5. Supabase Auth redirect configuration, migrations, RLS and RPC behavior are verified in the target environment.
6. No unresolved P0/P1 defect or data-integrity/security regression remains.

Merge stacked PRs in dependency order only after this gate is met. Browser UAT approval does not itself authorize production deployment.
