# UI-03 — Mind Map Editor UX Implementation Contract

Status: **Planning contract prepared; implementation is gated by UI-02 CI and UAT.** This work improves the existing editor incrementally. It is not a graph-engine rewrite.

## 1. Objective

Turn the current editor into a trustworthy, canvas-first workspace with clear editing controls, truthful persistence and sharing states, responsive outline/inspector behavior, and accessible keyboard/touch workflows.

The existing editor already contains a working React Flow canvas, outline, inspector, local draft recovery, import/export, canonical graph commands and bounded undo/redo. UI-03 must improve the experience around those capabilities without replacing their domain behavior.

## 2. Current implementation audit

The current editor is concentrated in `app/page.tsx` and uses:
- `@xyflow/react` as a renderer adapter.
- Canonical graph operations from `lib/domain/graph-commands.ts`.
- Conversion boundaries from `lib/domain/graph-adapter.ts`.
- Document validation and local persistence from `lib/domain/document-lifecycle.ts`.
- Bounded history from `lib/domain/history.ts`.
- Local draft keys `mindmap-pro:local-draft:v2`, legacy `v1`, and recovery `recovery`.

The existing UI also contains elements that must not be mistaken for live account/cloud functionality:
- Hard-coded workspace identity and plan labels (for example, “Workspace pribadi”, “Free workspace”, and “Workspace owner”).
- Hard-coded recent-map entries and map counts.
- A “Bagikan” control that copies the current browser URL but does not create an authorized share link or grant access.
- A privacy/saved presentation that must distinguish local browser storage from server persistence.

**First UI-03 task:** remove or relabel these misleading affordances. Do not replace them with fabricated cloud data. Use explicit local-only labels until an authenticated map persistence and sharing contract is implemented.

## 3. Non-negotiable architecture boundaries

1. React Flow remains a renderer adapter; it is not the canonical graph store.
2. All graph mutations continue through validated canonical commands.
3. Keep graph content, layout coordinates, viewport state and ephemeral UI state separate.
4. Preserve node/edge identity, hierarchy/cross-link semantics, import/export schema and revision behavior.
5. Preserve local draft keys, migration, recovery backup rules and autosave failure behavior.
6. Preserve bounded undo/redo and ensure every accepted mutation is represented in history where appropriate.
7. Do not silently convert a local draft into a cloud document. Cloud persistence requires an explicit user action, verified session, selected workspace and a dedicated persistence use case.
8. No client-supplied workspace ID, plan, quota or role is trusted for authorization.
9. Sharing remains unavailable until a server-authorized share-link contract supports scope, role, expiry and revocation.

## 4. Delivery slices

### UI-03A — Editor truthfulness and shell cleanup

- Replace hard-coded account/workspace identity, plan, recent maps and counts with local-only labels or remove the controls.
- Change the current “Bagikan” action to an honest “Salin tautan halaman” action only if that behavior is retained; otherwise disable/remove it until real sharing exists.
- Distinguish “Tersimpan di browser” from cloud-saved/synced status.
- Ensure error states explain that the original draft is preserved and autosave may be paused.
- Do not introduce a new cloud persistence path in this slice.

**Evidence:** tests or source assertions for no fabricated identity/counts/recent maps; manual desktop/mobile review; local draft recovery regression.

### UI-03B — Command and toolbar contract

- Group file, edit, insert, layout, view and export actions into a predictable command hierarchy.
- Provide discoverable tooltips/labels and keyboard shortcuts with a shortcut reference.
- Disable unavailable actions rather than linking to dead routes or fake behavior.
- Keep import as validate → preview (if introduced) → accept; never overwrite the current document on parse failure.
- Ensure export uses the validated canonical document serialization.

**Evidence:** command unit tests, shortcut conflict review, import/export round-trip and keyboard-only UAT.

### UI-03C — Canvas, outline and inspector interaction

- Maintain canvas as the primary visual surface.
- Keep outline selection synchronized with canvas selection and focused navigation.
- Provide an accessible semantic alternative for selecting, creating, renaming, reparenting and deleting topics.
- Keep hierarchy edges derived from canonical parent relationships; cross-links remain distinct typed relationships.
- Make inspector actions contextual and explicit; destructive operations require clear confirmation or reliable undo.
- Ensure panel open/close state never blocks core canvas interactions.

**Evidence:** graph-command tests, selection synchronization tests, focus order and pointer/touch/keyboard UAT.

### UI-03D — Persistence and revision status presentation

- Show the actual local persistence lifecycle: restoring, ready, saving locally, saved locally, recovery required and save failed.
- Never label localStorage as cloud save, cross-device sync or server persistence.
- If cloud persistence is introduced later, show local and cloud states separately (pending, saved, conflict, offline, failed).
- Revision conflicts must offer reload/compare/recovery behavior; never silently overwrite a newer revision.
- Preserve recovery backup and original draft when parsing or storage operations fail.

**Evidence:** lifecycle tests, storage quota/failure tests, recovery tests and revision conflict tests.

### UI-03E — Responsive and accessible editor

- Desktop: canvas first with collapsible outline and inspector.
- Tablet: canvas priority with one panel visible at a time when space is constrained.
- Mobile: touch-sized canvas controls and sheet-based outline/inspector with clear close/back behavior.
- Test 320, 375, 768, 1024 and 1440 px viewports and both orientations where relevant.
- Verify focus visibility, semantic names, Escape behavior, reduced motion and no horizontal overflow.
- Respect reduced-motion preferences and light/dark design tokens.

**Evidence:** responsive visual regression, keyboard/touch UAT, accessibility scan and measured interaction performance.

## 5. Proposed component boundaries

Do not split the large editor file mechanically before tests exist. First establish behavior contracts, then extract one boundary at a time:

- `app/components/editor/editor-shell.tsx` — layout composition only.
- `app/components/editor/editor-toolbar.tsx` — command presentation and disabled/loading state.
- `app/components/editor/editor-outline.tsx` — semantic topic navigation.
- `app/components/editor/editor-inspector.tsx` — selected-topic properties.
- `app/components/editor/editor-canvas.tsx` — React Flow renderer adapter.
- `app/components/editor/editor-status.tsx` — local persistence/recovery state.
- `lib/application/editor-commands.ts` (only if needed) — orchestration boundary that delegates to existing canonical graph commands.

Keep domain rules in `lib/domain`; do not move business invariants into UI components.

## 6. Test strategy

- Unit: canonical graph commands, adapter round-trip, history, document validation and import/export.
- Component: toolbar disabled states, outline selection, inspector actions, local status labels and accessible names.
- Integration: edit → undo → redo → reload → recover; import valid/invalid documents; storage unavailable/quota exceeded.
- E2E: create/edit/nest/reparent/delete topics, cross-link, keyboard navigation, mobile panel flow, export/re-import.
- Regression: exact local draft keys and recovery semantics remain unchanged.
- Performance: baseline initial route JavaScript, large-map rendering, interaction latency and save latency before optimizing.

All CI evidence must be tied to the exact pull-request head. Visual UAT complements but never replaces automated integrity tests.

## 7. Explicitly out of scope

- Replacing React Flow or introducing Canvas/WebGL without benchmark evidence.
- Changing canonical graph schema, graph commands, IDs, edge semantics or history policy.
- Enabling cloud autosave, collaboration or share links without complete server contracts.
- Adding AI editing, document ingestion, billing or premium entitlements to the editor.
- Broad `app/page.tsx` rewrite or repository-wide directory migration.

## 8. Entry and exit gates

**Entry gate:** UI-02C and UI-02D exact-head CI pass; UI-02 dependency chain is merged in order; signed-in/signed-out and responsive shell UAT is accepted.

**Exit gate:** UI-03A–E acceptance evidence is available; existing graph, history, import/export and local recovery tests pass; no fabricated cloud/account state remains; desktop/mobile keyboard and touch workflows are accepted.

## 9. Recommended implementation order

1. UI-03A truthfulness cleanup (remove fake account/workspace/recent-map data and correct share/save wording).
2. UI-03D persistence-state semantics (local-only first; cloud only when separately authorized).
3. UI-03B toolbar/command organization.
4. UI-03C outline/inspector/canvas extraction and interaction tests.
5. UI-03E responsive/accessibility hardening.
6. Extract components incrementally after behavior tests, not before.
