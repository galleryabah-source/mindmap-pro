# UX and Accessibility

## Editor shell
Top bar: map title, save state, undo/redo, share, presentation, export, account. Left rail: outline, templates, search, attachments, history. Canvas: graph, node selection, contextual handles. Inspector: text, notes, style, links, tags, tasks. Mobile uses compact toolbar and sheet-based inspector; no hover-only actions.

## Interaction rules
- Predictable selection/edit behavior and explicit add-child/add-sibling actions.
- Escape cancels transient edits; undo/redo availability is visible.
- Destructive actions require confirmation or reliable undo.
- Drag actions have keyboard alternatives.
- Preserve selection and viewport after structural changes where possible.
- Branch focus must not make content inaccessible to search or outline navigation.
- Save failure preserves draft and offers retry/export recovery.

## Accessibility
Target WCAG 2.2 AA for core flows. Provide semantic outline/tree alternative, accessible names, visible focus, logical tab order, keyboard-only operation, contrast, reduced-motion support and browser zoom. Do not communicate status only through color. Announce save state and import/export results to assistive technology. Test screen-reader flows.

## Performance UX
Show progress/errors for long imports, AI jobs and exports; allow cancellation when safe. For large maps, render visible nodes first and clearly indicate partial loading.

## Design system
Use original design tokens, colors, typography, spacing, focus rings, node states, themes and assets. Do not copy proprietary branding or visuals.
