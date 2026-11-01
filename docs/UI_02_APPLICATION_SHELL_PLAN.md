# UI-02 — Application Shell Implementation Plan

Status: **Implementation contract / not yet implemented.** This plan decomposes UI-02 into reviewable increments. It deliberately builds on the existing editor instead of replacing it.

## 1. Objective

Deliver a coherent application shell with responsive navigation, contextual header, dashboard entry point, route-level loading/error boundaries and account entry. Keep the current mind-map editor usable at its existing URL while the shell is introduced incrementally.

## 2. Current-state constraints

- The existing editor is implemented in `app/page.tsx` and already contains the React Flow canvas, outline, inspector, responsive mobile sheet, theme toggle and local draft recovery.
- The editor's graph operations must continue to flow through the canonical graph commands and graph adapter.
- Local draft keys and migration/recovery behavior are compatibility-sensitive. UI-02 must not rename, clear or reinterpret them.
- Authentication and workspace APIs exist in the repository, but a dashboard must not infer that a user has cloud maps or sync capability merely because a session UI is present.
- The current browser draft is a single local document, not a server-backed recent-maps collection. Do not render fabricated map counts, activity, storage usage, sync status or collaboration presence.

## 3. Target route and component boundaries

Introduce shared shell components in the existing `app/` structure without a repository-wide directory migration:

- `app/components/layout/workspace-shell.tsx` — shell composition and responsive frame.
- `app/components/layout/workspace-sidebar.tsx` — primary navigation and active route state.
- `app/components/layout/workspace-header.tsx` — page title/breadcrumb, search affordance, create action and account entry.
- `app/components/layout/mobile-navigation.tsx` — accessible mobile drawer or bottom navigation.
- `app/dashboard/page.tsx` — dashboard route, composed from reusable dashboard sections.
- `app/dashboard/loading.tsx` and `app/dashboard/error.tsx` — route-level loading and recoverable error states where data fetching requires them.

Keep the current editor at `/` during the first dashboard increment. Do not mechanically relocate the large editor page until the shared shell has passed its own route and visual checks. UI-03 may then adopt the shared shell through a separately reviewed change.

## 4. Dashboard data contract

Dashboard content must be sourced from real capabilities and explicit states:

1. **Create / continue:** provide a clear route to the existing editor. If the local draft exists, describe it as a local browser draft; do not imply cross-device availability.
2. **Workspace list:** only display workspaces returned by the authenticated workspace API after the server confirms membership. Handle signed-out, empty, loading, forbidden and request-failure states separately.
3. **Recent maps:** do not show a recent-map list until a server-authorized list endpoint and its pagination/order contract are available. Do not infer maps from demo graph fixtures.
4. **Templates and document intelligence:** present only destinations that are implemented and enabled. Future capabilities may be described as unavailable, but must not be wired to dead-end buttons.
5. **Account/plan:** show authenticated identity only from the verified session. Plan, quota and entitlement values must come from a server-authoritative contract; omit unknown values rather than inventing defaults.

## 5. Navigation contract

- Navigation items are typed descriptors with stable IDs, labels, destinations, icon and required capability.
- Active state derives from the current route, not local decorative state.
- Hide or render disabled states for destinations that have no implemented route or authorization contract.
- All navigation controls are semantic links; actions are buttons. Provide visible keyboard focus and accessible names.
- Mobile navigation must trap/restore focus appropriately when implemented as a modal drawer, close on Escape, and not obscure the editor's canvas controls.

## 6. Responsive and accessibility requirements

- Mobile (320–767 px): compact header, touch-sized controls, drawer/sheet navigation and no horizontal page overflow.
- Tablet (768–1023 px): collapsible navigation with content priority.
- Desktop (1024 px+): persistent/collapsible sidebar and contextual header.
- Respect light/dark semantic tokens and `prefers-reduced-motion`.
- Verify keyboard-only navigation, focus order, landmarks, heading hierarchy, contrast and minimum touch targets.
- Provide skeleton/loading, empty, signed-out, permission-denied and retryable error states.

## 7. Security and data integrity boundaries

- Client-side route visibility is UX only; every protected request must still be authorized server-side.
- Never expose service-role credentials or trust client-supplied workspace IDs, plan names, usage or capabilities.
- Do not enable cloud sync or mutate graph persistence as part of shell work.
- Do not change canonical graph schema, graph commands, revision semantics, local draft storage keys or recovery behavior.
- No billing provider, payment collection, subscription mutation or entitlement override is in scope.

## 8. Delivery slices

| Slice | Scope | Required evidence |
|---|---|---|
| UI-02A | Shared shell primitives and route landmarks | lint, typecheck, component tests, keyboard/focus checks |
| UI-02B | Dashboard empty/loading/signed-out states | route tests, no fabricated data, responsive screenshots |
| UI-02C | Authenticated workspace summary integration | API contract tests, membership/forbidden tests, no client-trusted authorization |
| UI-02D | Navigation and account entry polish | route tests, mobile/desktop visual regression, accessibility review |

Slices may be separate pull requests. Do not combine all route migration and dashboard data integration into one large change.

## 9. Acceptance criteria

- Existing editor route and its graph, undo/redo, autosave, draft migration and recovery tests remain unchanged and pass.
- Dashboard renders truthful states for signed-out, empty, loading, forbidden and failed requests.
- Workspace data appears only after authenticated server response; no fake map counts or recent activity.
- All navigation destinations resolve to implemented routes or are intentionally unavailable.
- Responsive layout has no horizontal overflow at 320 px, 768 px, 1024 px and 1440 px.
- Keyboard navigation, focus visibility, Escape behavior and accessible landmarks pass review.
- Light/dark themes use semantic tokens; reduced-motion preference is respected.
- Lint, typecheck, unit tests, production build and route-level E2E checks pass on the exact PR head.

## 10. Explicitly out of scope

- Replacing React Flow or the canonical graph engine.
- Rewriting `app/page.tsx` or migrating the entire repository to a new `src/` layout.
- Cloud synchronization, collaboration presence, AI workflows or real payment processing.
- Claiming production readiness without deployment, security and operational evidence.
