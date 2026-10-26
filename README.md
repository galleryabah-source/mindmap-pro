# MindMap Pro — Visual Knowledge Studio

MindMap Pro is a web-first visual knowledge workspace designed to grow into Android and Windows desktop applications while sharing a canonical domain model and backend.

## Current implementation milestone

The first web application foundation introduces a responsive mind-map editor shell with node selection, topic creation, connections, rename, deletion of non-root nodes, undo/redo, local draft persistence and JSON export. This is an early client-side vertical slice; authentication, server persistence, AI workflows, template engine and native platform packages are not yet implemented.

## Technology

- Next.js App Router, React and TypeScript
- `@xyflow/react` for interactive graph rendering
- Node.js 22 in CI
- Supabase PostgreSQL planned as the canonical persistence layer; not yet connected
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
npm run build
```

## Security and data notes

- Current editor draft persistence is browser-local and device-specific. It is not cloud sync or a backup.
- Do not place Supabase service-role keys, database URLs or other privileged secrets in client code.
- Server persistence must be added with authenticated, server-enforced workspace authorization and versioned migrations.
- Do not treat the app as production-ready until CI, authorization, persistence/recovery, accessibility, security and backup/restore gates pass.

## Product documentation

- [Brainstorm backlog](docs/BRAINSTORM_BACKLOG.md)
- [Premium UX and template system](docs/PRODUCT_STRATEGY_AND_DESIGN_SYSTEM.md)
- [Multi-platform delivery strategy](docs/MULTI_PLATFORM_DELIVERY.md)
- [Roadmap](docs/ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)