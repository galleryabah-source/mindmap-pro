# Feature Parity Matrix

This is a planning matrix, not a claim that every current reference-product feature or paid entitlement has been verified. Verify official Mindomo documentation and plan availability before declaring parity.

Priority: P0 foundation; P1 core; P2 advanced; P3 scale/polish.

| Capability | Priority | Target phase | Acceptance evidence |
|---|---|---|---|
| Map CRUD, duplicate, archive/restore | P0 | Foundation | E2E and authorization tests |
| Hierarchical topics and cross-links | P0 | Editor | Invariant tests |
| Drag/drop, reorder, indent/outdent | P0 | Editor | Pointer and keyboard tests |
| Collapse/expand, pan/zoom, fit | P0 | Editor | Browser tests |
| Autosave, recovery, undo/redo | P0 | Editor | Network-failure tests |
| JSON import/export | P0 | Foundation | Round-trip fixtures |
| Search and outline/tree view | P1 | Core | Search correctness |
| Themes, styles, icons, labels | P1 | Core | Persistence/visual tests |
| Notes, links, attachments | P1 | Core | Permission/storage tests |
| OPML import/export | P1 | Core | Fidelity fixtures |
| SVG/PNG/PDF export | P1 | Core | Output validation |
| Templates and revision restore | P1 | Core | Clone/history tests |
| Presentation mode | P1 | Core | Step order/keyboard tests |
| Share links and roles | P1 | Core | Expiry/revocation tests |
| PDF/document-to-map | P1 | Knowledge | Provenance tests |
| AI generation and expansion | P1 | Knowledge | Evaluation/quota/safety |
| Comments and mentions | P2 | Collaboration | Permission/notification tests |
| Real-time co-editing/presence | P2 | Collaboration | Concurrency stress tests |
| Tasks and due dates | P2 | Planning | Date-boundary tests |
| Calendar/Gantt | P3 | Planning+ | Timezone/dependency tests |
| Offline editing | P3 | Advanced | Conflict/recovery tests |
| Subscription/entitlements | P2 | Monetization | Webhook idempotency |
| SSO/SCIM/enterprise retention | P3 | Enterprise | Contract/compliance review |
| Mobile-optimized editor | P2 | UX hardening | Device/touch matrix |

## Review procedure
Record official source URL and access date; mark capabilities verified/inferred/unavailable/not applicable; note plan/platform limitations; define acceptance criteria; repeat before launch because product plans change.
