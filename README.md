# MindMap Pro — Product & Engineering Blueprint

An original web-first mind-mapping and knowledge workspace targeting feature parity with publicly documented premium capabilities of products such as Mindomo. This project uses its own branding, code, interaction design and assets; it does not copy proprietary code or protected assets.

## Status
- Blueprint: committed in this repository
- Implementation: not started
- Production readiness: not assessed
- Target stack: Next.js App Router, React, TypeScript, Node.js, PostgreSQL

## Vision
A dependable workspace for visual thinking, hierarchical knowledge exploration, document-to-map workflows, AI-assisted drafting, collaboration, presentation, task planning and export.

## Principles
1. Data integrity and recoverability first.
2. Stable topic IDs; hierarchy and cross-links are distinct.
3. AI-generated content remains a proposal until user acceptance.
4. Preserve source provenance for document-derived concepts.
5. Modular monolith first; extract services only when measured needs justify it.
6. Every release passes CI, authorization, migration, backup and quality gates.

## Documentation
- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Feature parity matrix](docs/FEATURE_PARITY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Engineering principles: performance, responsiveness and extensibility](docs/ENGINEERING_PRINCIPLES.md)
- [PostgreSQL data model](docs/DATA_MODEL.md)
- [API contract](docs/API_CONTRACT.md)
- [Security and privacy](docs/SECURITY.md)
- [UX and accessibility](docs/UX_ACCESSIBILITY.md)
- [AI/document pipeline](docs/AI_PIPELINE.md)
- [Quality gates](docs/QUALITY_GATES.md)
- [Roadmap](docs/ROADMAP.md)
- [Delivery plan](docs/DELIVERY_PLAN.md)
- [Architecture decisions](docs/DECISIONS.md)

## Proposed stack
- Web: Next.js App Router, React, TypeScript
- API: Next.js Route Handlers initially; Node.js workers for heavy jobs
- Database: PostgreSQL with reviewed, versioned migrations
- Graph renderer: SVG/Canvas adapter independent of domain logic
- File storage: S3-compatible adapter
- Jobs: durable queue with idempotency and bounded retries
- Tests: unit, integration, Playwright E2E, accessibility, security and load tests
- Deployment: container-ready with CI/CD and migration discipline

## First vertical slice
Authenticated workspace → create/open map → add/edit/move/nest topics → collapse/expand → undo/redo → autosave with explicit status → JSON import/export → automated authorization and E2E tests.

## Important boundary
Feature parity is a goal, not a claim that every current reference-product feature or paid entitlement is verified or implemented. Verify official product documentation and plan availability before finalizing parity.
