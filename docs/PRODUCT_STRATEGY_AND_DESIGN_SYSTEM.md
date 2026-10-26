# Product Strategy, Premium UX and Template System

## Product position
MindMap Pro is a visual knowledge workspace: mind mapping, document-to-knowledge workflows, learning, planning, presentation and collaboration in one coherent product. The product must feel premium without sacrificing performance, accessibility, data integrity or predictable behavior.

## Product principles
1. Reliability before feature count: never silently lose user edits.
2. Progressive complexity: powerful features are discoverable but do not crowd the canvas.
3. One canonical graph model: templates, AI, presentation and collaboration use the same validated domain model.
4. User control: AI output is a draft, imports are previewed, and destructive actions are recoverable.
5. Responsive by default: desktop, tablet, mobile, keyboard and touch are supported design targets.
6. Extensible by contract: modules expose versioned interfaces and do not directly mutate other modules' data.
7. Measure before optimizing: set and test performance budgets on representative devices and map sizes.

## Recommended information architecture
- Home / Recent: recent maps, pinned maps, activity, create-new actions and templates.
- Workspace: maps, folders/collections, shared items, archive and search.
- Editor: compact top bar; optional left navigation rail; canvas; contextual inspector; collapsible outline/minimap; command palette.
- Template Gallery: search, category filters, previews, favorites, duplicate-to-edit and user/team collections.
- AI Knowledge Studio: document upload, extraction preview, source selection, generation settings, proposed outline, source citations and accept/reject review.
- Presentation: step navigator, focused branch, presenter notes, keyboard navigation and clean audience view.
- Settings: profile, workspace members, access, storage, export/delete data, appearance and plan/usage.

## Premium visual design system
- Offer polished light and dark themes; respect system preference and remember the user's choice.
- Use a deliberate type scale, consistent spacing tokens, restrained shadows, clear contrast and consistent iconography.
- Use design tokens for color, spacing, typography, radius, elevation, focus and motion; avoid one-off styling.
- Keep canvas visually calm. Use contextual toolbars and inspectors rather than permanently displaying every control.
- Provide tasteful transitions for branch expansion, selection, panel changes and save status; respect reduced-motion preferences.
- Use a restrained set of professional palettes and map themes. Color must never be the only way to communicate status or grouping.
- Design empty, loading, error, offline, saving and permission-denied states—not only the happy path.
- Meet WCAG 2.2 AA for core workflows; use visible keyboard focus, accessible names and a semantic outline alternative.
- Establish visual regression tests for critical editor, template, mobile and presentation flows.

## Template library strategy
Templates are versioned data packages, not hard-coded screens. Each template has an ID, schema version, title, description, category, tags, locale, thumbnail, source/license metadata, default theme, layout preference, starter nodes/edges and optional instructional prompts. Template import must pass schema validation and size limits.

### Initial template catalog
1. General thinking: blank canvas, radial brainstorm, mind dump, idea clustering, question tree.
2. Learning: chapter summary, book analysis, lecture notes, exam revision, flashcards outline, concept map, language learning.
3. Research: literature review, research question, hypothesis tree, methodology, evidence synthesis, source comparison.
4. Business: SWOT, PESTLE, business model canvas outline, strategy map, OKRs, stakeholder map, risk register.
5. Projects: project plan, work breakdown structure, milestones, meeting notes, decision log, retrospective.
6. Personal productivity: goals, weekly plan, habit review, decision matrix, problem solving.
7. Education and training: lesson plan, curriculum map, course module, assessment blueprint, training pathway.
8. Content creation: article outline, book outline, video script, campaign plan, storytelling arc.
9. Software and systems: system architecture, API design, incident analysis, feature roadmap, data model.
10. Public service and operations: service process, SOP, policy analysis, operational indicators, service improvement.
11. Presentation: pitch deck outline, briefing, executive summary, workshop facilitation.
12. Custom/team: saved user templates, team-approved templates and organization-specific templates.

Launch with a small, carefully reviewed starter set; expand through quality-reviewed template packs rather than maximizing count without consistency. Never copy proprietary templates or assets from another product.

## Feature concepts worth prioritizing
- Command palette and keyboard shortcuts.
- Outline/tree editor synchronized with the canvas.
- Branch focus and presentation mode.
- Version history and restore-as-new-revision.
- PDF/document-to-map with source citations and page references where available.
- AI actions scoped to selected branch: explain, expand, summarize, compare, translate and generate questions.
- Template preview and duplicate-to-edit.
- Import/export validation and round-trip fidelity.
- Comments, share links with expiry/revocation, and clear viewer/editor roles.
- Task fields and due dates only after core graph and save semantics are stable.
- Offline editing and advanced real-time conflict resolution only after explicit consistency design and testing.

## Core technical engine recommendations
- Separate graph/domain rules from React components and the rendering library.
- Stable topic UUIDs; explicit hierarchy edges and typed cross-links; prevent invalid cycles.
- Keep canonical graph data separate from layout coordinates and viewport preferences.
- Use deterministic commands for edit operations and undo/redo.
- Benchmark SVG and Canvas with realistic map sizes and mobile devices; introduce WebGL only if measurements justify the complexity.
- Use incremental layout, viewport culling, batched updates and workers only where profiling demonstrates value.
- Autosave must expose pending/saved/error status, be idempotent, preserve drafts during network failure and handle stale revisions.
- Imports use validate → preview → commit; AI-generated graph changes use propose → review → accept.
- Collaboration operations require server-side authorization and domain validation regardless of transport.

## Suggested delivery order
1. Platform foundation: GitHub CI, Next.js/TypeScript, Supabase PostgreSQL migrations, auth/tenant authorization, secrets, health checks.
2. Editor vertical slice: create map, edit/nest/move nodes, collapse/expand, keyboard alternative, autosave, undo/redo, reload and JSON round-trip.
3. Visual quality: responsive shell, light/dark themes, tokens, mobile inspector, accessibility and visual regression.
4. Template engine: schema/versioning, preview, validation, initial template pack and custom template creation.
5. Productivity: search, outline, history, notes, links, attachments and export.
6. AI document workflows with provenance, quotas, evaluation and user review.
7. Sharing and collaboration; then planning, billing and enterprise features when validated.

## Definition of done
Each feature includes: user story and acceptance criteria; domain rules; server-side authorization; migration/data ownership where applicable; responsive and accessible states; loading/error/offline behavior; unit/integration/E2E tests; telemetry; documentation; and rollback/recovery considerations.
