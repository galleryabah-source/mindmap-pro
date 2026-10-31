# Brainstorm Backlog — Product, UX, Templates and Engine

Status: proposed product direction; not implemented unless a delivery item is explicitly marked complete.

## Vision
Build MindMap Pro as a premium visual knowledge workspace: a fast, reliable mind-map editor that connects structured thinking, learning, documents, AI-assisted knowledge extraction, presentations, planning and collaboration without fragmenting the canonical graph model.

## Product pillars
1. **Mind Map Engine** — reliable graph editing, hierarchy, cross-links, layout, navigation, keyboard and touch interaction.
2. **Premium Design System** — polished light/dark themes, responsive layouts, accessibility, visual consistency and meaningful interaction feedback.
3. **AI Knowledge Studio** — source-grounded document-to-map workflows, branch-level assistance and human review.
4. **Template Library** — searchable, versioned templates with preview, duplicate-to-edit and custom/team packs.
5. **Productivity & Collaboration** — outline, search, history, presentation, tasks, sharing, comments and carefully designed concurrent editing.

## UX and information architecture
- Home/Recent: recent and pinned maps, activity, create actions and template entry points.
- Workspace: maps, folders/collections, shared items, archive and global search.
- Editor: compact top bar; optional left rail; large calm canvas; contextual inspector; outline/minimap; command palette.
- Template Gallery: search, category filters, preview, favorites, duplicate-to-edit and personal/team collections.
- AI Knowledge Studio: upload, extraction preview, source selection, generation settings, proposed outline, citations and accept/reject review.
- Presentation: ordered steps, focused branch, presenter notes, keyboard navigation and audience view.
- Settings: profile, workspace members, access, storage, export/delete data, appearance and usage.

Mobile must use a dedicated compact toolbar and sheet-based panels rather than squeezing the full desktop layout onto a narrow screen.

## Premium design principles
- Design tokens for color, spacing, typography, radius, elevation, focus and motion.
- Light and dark themes, system preference support and remembered user choice.
- Restrained professional palettes; color is never the sole indicator of state or grouping.
- Contextual controls rather than permanently crowded toolbars.
- Visible saving/saved/error/offline states, plus designed empty/loading/permission-denied states.
- Reduced-motion support, semantic outline alternative, keyboard focus and WCAG 2.2 AA target for core workflows.
- Visual regression coverage for editor, template gallery, mobile and presentation.

## Template catalog — initial categories
1. General thinking: blank canvas, radial brainstorm, mind dump, idea clustering, question tree.
2. Learning: chapter summary, book analysis, lecture notes, exam revision, flashcard outline, concept map, language learning.
3. Research: literature review, research question, hypothesis tree, methodology, evidence synthesis, source comparison.
4. Business: SWOT, PESTLE, business model canvas outline, strategy map, OKRs, stakeholder map, risk register.
5. Projects: project plan, work breakdown structure, milestones, meeting notes, decision log, retrospective.
6. Personal productivity: goals, weekly plan, habit review, decision matrix, problem solving.
7. Education/training: lesson plan, curriculum map, course module, assessment blueprint, training pathway.
8. Content creation: article/book outline, video script, campaign plan, storytelling arc.
9. Software/systems: system architecture, API design, incident analysis, feature roadmap, data model.
10. Public service/operations: service process, SOP, policy analysis, operational indicators, service improvement.
11. Presentation: pitch deck outline, briefing, executive summary, workshop facilitation.
12. Custom/team: user-created templates, team-approved templates and organization-specific packs.

Template package contract: stable ID, schema version, title, description, category, tags, locale, thumbnail, source/license metadata, theme/layout defaults, starter nodes/edges and optional instructional prompts. Validate schema, size and licensing before import. Begin with a small curated set; prioritize consistency over raw quantity.

## Feature ideas to evaluate
- Command palette and keyboard shortcuts.
- Outline/tree editing synchronized with the canvas.
- Branch focus, deep expansion/collapse and presentation mode.
- Version history, restore as a new revision and safe recovery.
- PDF-to-MindMap Intelligence Engine: secure PDF ingestion, page-aware extraction/OCR, semantic and hierarchical knowledge construction, canonical graph compilation, source traceability and human-reviewed atomic workspace commit. See [the full blueprint](PDF_TO_MINDMAP_INTELLIGENCE_BLUEPRINT.md).
- Branch-scoped AI: explain, expand, summarize, compare, translate and generate questions.
- Template preview, duplicate-to-edit and custom template builder.
- Validated import/export with round-trip fidelity.
- Share links with expiry/revocation, viewer/editor roles and comments.
- Task fields, owners and due dates after core graph/save semantics stabilize.
- Offline editing and advanced real-time collaboration only after explicit consistency and conflict-resolution design.
- Search across maps and nodes, labels, notes, links and attachments.
- Export studio for SVG/PNG/PDF and later presentation/document formats.

## Engineering guardrails
- One canonical, validated graph/domain model shared by editor, templates, AI, presentation and collaboration.
- Stable topic UUIDs; distinguish hierarchy edges from typed cross-links; prevent invalid cycles.
- Separate canonical graph content from layout coordinates and viewport preferences.
- Deterministic edit commands, undo/redo, revision checks and idempotent persistence.
- Autosave exposes pending/saved/error status, preserves drafts through network failure and handles stale revisions.
- Imports follow validate → preview → commit; AI follows propose → review → accept.
- Benchmark SVG and Canvas with realistic maps and mobile devices; adopt WebGL only if measurements justify it.
- Use incremental layout, viewport culling and batched updates only when profiling supports them.
- Server-side authorization and domain validation for every collaboration operation.
- Store migrations and CI checks in GitHub; use Supabase PostgreSQL with explicit tenant boundaries; use Cloudflare for appropriate DNS/TLS/edge controls, not as an assumed drop-in Node.js runtime.

## Prioritization
**P0 — foundation and trustworthy editor**
- CI, app skeleton, env validation, health checks, identity/workspace authorization and database migrations.
- Graph invariants and canonical schema.
- Responsive editor shell, create/edit/nest/move, collapse/expand, keyboard alternative, undo/redo, autosave, reload and JSON round-trip.
- Basic accessibility and error/offline states.

**P1 — premium daily workflow**
- Design tokens, light/dark themes, mobile inspector, outline, command palette and search.
- Version history/recovery.
- Template schema, preview, validation and curated starter pack.
- SVG/PNG/PDF export and visual regression tests.

**P2 — document intelligence**
- Deliver the staged PDF-to-MindMap pipeline defined in [PDF_TO_MINDMAP_INTELLIGENCE_BLUEPRINT.md](PDF_TO_MINDMAP_INTELLIGENCE_BLUEPRINT.md): contracts, secure ingestion, parser/OCR, source-grounded semantic extraction, hierarchical builder, canonical graph compiler/validator, review studio, atomic commit and operational hardening.
- Branch-scoped AI actions with user review; never bypass canonical graph, authorization, revision or audit services.

**P3 — collaboration and planning**
- Sharing roles, revocable links, comments and concurrency/reconnect tests.
- Presentation flow, tasks and due dates after persistence contracts are stable.

**P4 — scale and commercial operations**
- Performance/load hardening, monitoring, backup/restore drills, privacy/terms, incident runbooks, usage plans and billing only when product validation supports them.

## Acceptance rules
- Brainstorm items are proposals, not claims of implementation.
- Every item entering a release must have an owner, user value, acceptance criteria, dependencies, security/data impact and test plan.
- No AI result silently overwrites user content.
- No feature may bypass canonical graph invariants, authorization or migration discipline.
- Reprioritize based on usability tests, telemetry, risk and measured performance—not feature count alone.
