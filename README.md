# MindMap Pro — Visual Knowledge Studio

MindMap Pro is a web-first visual knowledge workspace designed to grow into Android and Windows desktop applications while sharing a canonical domain model and backend.

## Current implementation milestone

The first web application foundation introduces a responsive mind-map editor shell with node selection, topic creation, connections, rename, deletion of non-root nodes, undo/redo, local draft persistence, validated JSON import/export and map-document validation tests. This is an early client-side vertical slice; authentication, server persistence, AI workflows, template engine and native platform packages are not yet implemented.

## Technology

- Next.js App Router, React and TypeScript
- `@xyflow/react` for interactive graph rendering
- Node.js 22 in CI
- Supabase PostgreSQL schema and SSR client foundation added; no project is linked and cloud persistence is not enabled yet
- Capacitor Android and Tauri Windows packaging planned after shared API/domain contracts stabilize

## Requirements

- Node.js 22 (or a compatible supported Node.js LTS)
- npm

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Security and data notes

- Current editor draft persistence is browser-local and device-specific. It is not cloud sync or a backup.
- Do not place Supabase service-role keys, database URLs or other privileged secrets in client code.
- The initial schema migration is in `supabase/migrations/`; apply it only to a dedicated MindMap Pro project after verifying its project ref.
- Server persistence must use authenticated, server-enforced workspace authorization and versioned migrations.
- Do not treat the app as production-ready until CI, authorization, persistence/recovery, accessibility, security and backup/restore gates pass.

## Product documentation

- [PDF-to-MindMap Intelligence Engine blueprint](docs/PDF_TO_MINDMAP_INTELLIGENCE_BLUEPRINT.md)
- [Brainstorm backlog](docs/BRAINSTORM_BACKLOG.md)
- [Premium UX and template system](docs/PRODUCT_STRATEGY_AND_DESIGN_SYSTEM.md)
- [Multi-platform delivery strategy](docs/MULTI_PLATFORM_DELIVERY.md)
- [Roadmap](docs/ROADMAP.md)
- [Supabase foundation](docs/SUPABASE_FOUNDATION.md)
- [Database migration](supabase/migrations/202610260001_initial_workspace_map_schema.sql)
- [Map document validator](lib/domain/map-document.ts)
- [Architecture](docs/ARCHITECTURE.md)
- [Canonical engine contract](docs/CANONICAL_ENGINE_CONTRACT.md)