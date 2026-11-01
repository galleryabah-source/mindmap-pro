# UI/UX and Front-End Architecture — Lightweight Premium Experience

Status: **Approved product direction / design specification.** This document defines the target experience and implementation contracts. It does not claim that every screen, payment flow or capability is already implemented.

## 1. Product experience

MindMap Pro adopts a **Lightweight Premium Workspace** design language: calm, fast, elegant and professional, with progressive disclosure. The interface should feel like one coherent visual knowledge workspace spanning mind mapping, document intelligence, AI assistance, learning, knowledge management and collaboration.

### Experience principles
1. Simple at first use; advanced capabilities remain discoverable.
2. Canvas and user content receive the greatest visual priority.
3. Consistency comes from shared tokens and components, not duplicated feature-specific styling.
4. Free and paid plans use the same application shell, graph engine, data model and security boundaries.
5. Premium access is an entitlement decision enforced by the server, never a client-only visual toggle.
6. Responsive and accessible workflows are designed alongside desktop, not retrofitted later.
7. No feature may compromise canonical graph integrity, recoverability or tenant authorization.

## 2. Visual language and design tokens

### Recommended initial palette
| Token | Initial value | Usage |
|---|---|---|
| Primary | `#6366F1` | Primary actions, selected navigation, focus accent |
| Secondary | `#8B5CF6` | Secondary emphasis and selected AI surfaces |
| Background | `#F8FAFC` | Application background |
| Surface | `#FFFFFF` | Cards, panels and dialogs |
| Text | `#1E293B` | Primary text |
| Muted text | `#64748B` | Secondary labels and metadata |
| Border | `#E2E8F0` | Dividers and control boundaries |
| Success | `#16A34A` | Successful states |
| Warning | `#D97706` | Warning states |
| Danger | `#DC2626` | Destructive/error states |

These are starting tokens, not permission to hard-code colors in individual components. Define semantic tokens for foreground/background pairs, hover/pressed/disabled states, focus rings, chart series and graph node palettes. Validate contrast in both themes. Never use color as the sole carrier of meaning.

### Typography, spacing and motion
- Use a readable modern sans-serif system stack with a deliberate type scale and restrained weights.
- Use a consistent spacing scale, radius scale, elevation levels and icon sizing.
- Prefer subtle borders and minimal shadows; avoid excessive gradients, glass effects and decorative motion.
- Respect `prefers-reduced-motion`; use short transitions only when they clarify state changes.
- Support light and dark themes, system preference and persisted user preference.

## 3. Information architecture and navigation

Use a collapsible primary sidebar on desktop, a compact navigation/drawer model on mobile, and a consistent top application bar.

### Proposed navigation
- **Workspace:** Dashboard, My Mind Maps, Recent, Favorites, Shared With Me.
- **Create:** New Mind Map, From Document, AI Mind Map, Templates, Import.
- **Knowledge:** Knowledge Graph, Document Library, Collections, Knowledge Search.
- **Learning:** Learning Maps, Flashcards, Quiz & Assessment, Learning Progress.
- **Collaboration:** Teams, Shared Workspace, Activity.
- **AI Assistant:** AI Chat, AI Analysis, AI Generator.
- **Settings:** Profile, Security, Subscription, Usage & Credits, Preferences.

Navigation is capability-aware. Do not expose unavailable modules as active destinations; show only enabled routes and permission-appropriate actions. Avoid dead-end menu items and placeholder buttons.

## 4. Application shell and core screens

### Application shell
- Global header: product identity, contextual breadcrumb/title, global search/command palette, create action, notifications and account menu.
- Sidebar: collapsible, keyboard navigable and responsive.
- Main content: route-level loading/error boundaries and consistent page width/spacing.
- Shared feedback: toast, inline validation, confirmation dialog, empty state and permission-denied state.
- Account/plan context: show plan and usage in account/settings surfaces without turning every page into an upgrade advertisement.

### Dashboard
- Welcome area with Create Mind Map, Generate with AI and Upload Document actions, subject to capability.
- Workspace summary: map count, recent activity, documents and shared projects.
- Recent maps with title, thumbnail/preview, last-edited time, save/sync state and contextual actions.
- Curated template gallery with category filters, preview and duplicate-to-edit.
- Search, favorites and useful empty states.
- Do not show fabricated usage statistics or imply cloud sync where only local drafts exist.

### Mind Map Editor
Use a canvas-centered three-region layout:
- **Top toolbar:** File, Edit, Insert, Layout, Theme, AI, Share and Export; actions appear only when available.
- **Left panel:** outline/tree navigator, search within map, minimap or navigation controls where useful.
- **Center canvas:** primary graph surface with pan/zoom, selection, keyboard and touch support.
- **Right inspector:** contextual node properties, content, style, notes, links and attachments.
- **Bottom status:** zoom, save state, revision/sync status and collaboration presence when implemented.

Panels must be collapsible and their state must not obstruct the canvas. On small screens, use drawers/sheets and contextual toolbars rather than compressing all desktop panels.

### Editor interaction requirements
- All edits pass through canonical graph commands and domain validation.
- React Flow / `@xyflow/react` is a renderer adapter, not the canonical graph store.
- Keep graph content, layout coordinates, viewport preferences and ephemeral UI state separate.
- Provide outline-based semantic navigation and editing as an alternative to pointer-only canvas operations.
- Undo/redo must be deterministic and bounded by documented history policy.
- Autosave must clearly communicate pending, saved and failed states; preserve recoverable drafts.
- Imports follow validate → preview → commit. AI follows propose → review → accept.
- Export formats must preserve supported structure and have round-trip/fixture tests.

## 5. Responsive behavior

| Class | Width guideline | UX behavior |
|---|---:|---|
| Mobile | 320–767 px | Compact header, touch-first canvas, bottom/context toolbar, sheet-based outline and inspector |
| Tablet | 768–1023 px | Canvas priority, collapsible side panels, touch and keyboard support |
| Desktop | 1024–1439 px | Full shell, optional outline and inspector |
| Large desktop | 1440 px+ | Full workspace with controlled max-width and resizable panels |

Use fluid layouts and content-aware breakpoints; the table is a starting guide, not a substitute for device testing. Ensure touch targets, orientation changes, keyboard navigation and zoom remain usable.

## 6. Shared design system and front-end module boundaries

### Shared component system
Build and maintain reusable primitives for buttons, links, inputs, selects, menus, dialogs, cards, tabs, tooltips, tables, badges, skeletons, toasts, empty states and navigation. Components must expose accessible names, focus behavior, disabled/loading states and consistent variants.

### Suggested front-end structure
```text
src/
  app/
    (public)/
    (auth)/
    (workspace)/
    editor/
  components/
    ui/
    layout/
    navigation/
    feedback/
    shared/
  design-system/
    tokens/
    themes/
    components/
  features/
    dashboard/
    mindmap/
    graph/
    document-intelligence/
    ai/
    knowledge/
    learning/
    collaboration/
    monetization/
  adapters/
    graph-renderer/
    storage/
    integrations/
  core/
    graph-engine/
    authorization/
    entitlements/
    persistence/
  lib/
    validation/
    utils/
    performance/
```

This is a target organization. Before moving files, inspect the current repository and preserve working module boundaries. Do not perform a large directory rewrite solely to match this diagram.

### Module contract
- Each feature owns its routes, UI composition, application hooks and feature-specific tests.
- Shared UI primitives live in the shared design system; feature-specific business logic does not.
- Cross-feature communication uses typed application interfaces/events, not direct mutation of another feature's state or tables.
- Capability registry/feature configuration controls navigation visibility and route availability.
- Avoid loading heavy feature code on routes that do not need it.

## 7. Front-end technology and performance policy

- Next.js App Router, React and strict TypeScript, aligned with the repository's pinned toolchain.
- Tailwind CSS and shared design-system components; avoid competing styling systems.
- Use Server Components for non-interactive surfaces and isolate Client Components around interactive editor boundaries.
- Use route-level code splitting and dynamic imports for editor, AI, document processing and export modules.
- Keep graph renderer behind an adapter. Benchmark SVG and Canvas with realistic map sizes and mobile devices; use WebGL only when evidence justifies the added complexity.
- Use Web Workers for CPU-heavy layout/analysis only when profiling shows main-thread contention.
- Apply virtualization, viewport culling, incremental layout and batched updates based on measurement.
- Define budgets and collect field/lab evidence for LCP, INP, CLS, initial JavaScript, editor interaction latency, save latency and large-graph rendering.
- Initial web vitals goals: LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the 75th percentile on representative traffic. These are targets, not current measured results. A compressed JavaScript budget may be proposed after bundle analysis; do not claim an unverified budget is met.
- Avoid loading AI, billing, collaboration or document dependencies in the initial dashboard bundle.

## 8. Premium experience and monetization UX

### Commercial model to validate
The initial packaging hypothesis is:
- **Free:** core map creation/editing, starter templates and baseline export/usage limits.
- **Pro:** advanced AI/document workflows, advanced templates/export and extended history/usage.
- **Team:** shared workspaces, collaboration, team library and member administration.
- **Business / Enterprise:** organization controls, advanced authorization/audit, integrations and support.

Illustrative price hypotheses for market testing only (not approved published prices):
- Pro: IDR 49,000 per month.
- Team: IDR 149,000 per month for a defined starter team allowance.
- Business/Enterprise: custom quote.

Do not publish these amounts until willingness-to-pay, operating costs, AI costs, payment fees, taxes, support burden and included quotas have been validated. Define monthly/annual options only after the commercial model is approved.

### Additional monetization hypotheses
- Subscription plans.
- Metered AI credits with transparent consumption and cost controls.
- Quality-reviewed template marketplace with creator/license and revenue-share rules.
- Team/member billing.
- Enterprise licensing and optional integration/support packages.

Marketplace payouts and creator revenue share are later-stage capabilities requiring legal, tax, fraud, moderation and payment-provider review.

### Upgrade and downgrade UX
- Clearly label premium capabilities and explain the value before an upgrade prompt.
- Let users preview workflows and understand quota/credit consumption before running expensive AI tasks.
- Show current plan, included quota, usage period, usage history and next reset date.
- Provide pricing comparison, checkout confirmation, payment status and invoice/history surfaces.
- Do not use deceptive urgency, forced upgrades or repeated blocking modals.
- Never delete user maps or documents when a subscription expires or downgrades.
- Define graceful downgrade behavior: retain read/access to existing data; explain which creation, processing, collaboration or export actions are limited by the new entitlement.
- Provide cancellation, renewal, payment-failure and refund/support states with clear user communication.

## 9. Billing, usage and entitlement architecture

The front end is a presentation layer; the server is authoritative.

Required conceptual services/contracts:
- **Plan catalog:** versioned plan definitions and feature/limit metadata.
- **Entitlement service:** evaluates account/workspace capabilities and limits server-side.
- **Usage metering:** records units, period, actor, workspace, feature, idempotency key and cost metadata as appropriate.
- **Billing adapter:** provider-neutral checkout, subscription lifecycle and invoice/payment references.
- **Webhook intake:** signature verification, idempotency, replay protection and audit.
- **Billing ledger/audit:** append-only transaction and state-transition evidence appropriate to the accounting model.

Security and integrity requirements:
1. Never trust a client-supplied plan, role, price, usage balance or entitlement.
2. Verify payment provider webhooks on the server; reject invalid signatures.
3. Make webhook processing idempotent and safe under retries/out-of-order delivery.
4. Do not grant paid entitlements from a browser redirect or client callback alone.
5. Use explicit subscription states and effective dates; preserve an auditable history.
6. Enforce tenant/workspace membership and feature access on every protected API operation.
7. Separate payment transaction records from usage consumption records.
8. Keep provider credentials server-side and redact payment/customer secrets from logs.
9. Define refund, chargeback, grace-period, failed-renewal and cancellation behavior before launch.
10. Use a payment provider adapter only after provider contract, supported payment methods and legal requirements are verified.

AI credits must have clear unit definitions, preflight estimates where feasible, maximum spend/usage limits, failure/refund semantics and an auditable consumption ledger. A credit balance shown in the UI is a projection of server-authoritative usage records.

## 10. Accessibility, quality and observability

- Target WCAG 2.2 AA for core workflows.
- Full keyboard access, visible focus, semantic landmarks, accessible dialogs and meaningful screen-reader labels.
- Canvas operations have outline/tree alternatives; do not make graph meaning available only through spatial position or color.
- Respect reduced motion and browser zoom; test contrast in light and dark modes.
- Design loading, empty, error, offline, saving, saved, permission-denied, quota-exceeded and payment-pending states.
- Add visual regression coverage for shell, dashboard, editor, mobile panels, pricing and billing-critical screens.
- Add unit/component/integration/E2E tests for navigation, entitlement states, checkout transitions, usage display and responsive behavior.
- Measure real user performance and interaction outcomes; redact document contents, map content, payment secrets and tokens from telemetry.

## 11. Delivery sequence and gates

| Phase | Scope | Exit evidence |
|---|---|---|
| UI-01 | Design tokens, themes, typography, spacing, shared primitives | Token/component tests, contrast and visual baselines |
| UI-02 | Application shell, responsive navigation, dashboard and account entry | Route, responsive, accessibility and visual regression tests |
| UI-03 | Editor shell, toolbar, canvas adapter, outline, inspector and status | Canonical command integration, keyboard/touch and save-state tests |
| UI-04 | Document, AI, knowledge and learning surfaces | Provenance/review UX, permission/quota states and feature-specific tests |
| UI-05 | Pricing, plan/usage pages, upgrade/downgrade and billing UI | Server-enforced entitlement contract and billing-state integration tests |
| UI-06 | Team and collaboration surfaces | Server authorization, invitation, revocation and concurrency tests |
| UI-07 | Performance, accessibility and production UX hardening | Measured performance, WCAG review, E2E/visual suite and recovery evidence |

Recommended implementation order is UI-01 → UI-02 → UI-03, while documenting entitlement/billing contracts early. Do not activate real payment collection until backend billing, webhook security, entitlement enforcement, provider terms and operational support are ready.

## 12. Definition of done

A UI feature is complete only when it has:
- approved user journey and acceptance criteria;
- design tokens and shared components rather than one-off styling;
- responsive behavior for supported breakpoints;
- keyboard/accessibility and reduced-motion behavior;
- loading, empty, error, offline and permission/quota states as applicable;
- server-side authorization and entitlement enforcement for protected actions;
- unit/component/integration/E2E coverage appropriate to risk;
- visual regression and performance evidence for critical flows;
- telemetry without sensitive content leakage;
- documentation, migration/rollback and support implications where applicable.

## 13. Explicit non-goals for this design approval

- This document does not authorize immediate production deployment or payment collection.
- It does not select or contract a payment provider.
- It does not establish final subscription prices, quotas, AI credit conversion rates or marketplace revenue share.
- It does not require a rewrite of the existing canonical graph engine, database schema or working application structure.
- It does not assert that proposed screens, modules, performance targets or billing services already exist.
