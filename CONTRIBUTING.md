# Contributing

Read product requirements, architecture, data model and quality gates before implementing features. Open an issue for substantial behavior/schema changes and record important decisions in docs/DECISIONS.md.

## Engineering rules
- TypeScript strict mode.
- Validate untrusted inputs at boundaries.
- Keep domain invariants independent from React components.
- Add tests for bug fixes and authorization rules.
- Never commit secrets, production data, private documents or unauthorized assets.
- Use migrations for schema changes; do not edit production schema manually.
- Keep API errors stable and avoid leaking internals.

## Pull requests
Describe purpose, scope, test evidence, migration impact, security/privacy implications and screenshots for UI changes. Required CI checks must pass before merge.
