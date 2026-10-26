# Multi-Platform Delivery Strategy

## Decision and product target
MindMap Pro is planned as a web-first product with three supported delivery surfaces:
1. Responsive web application.
2. Android application distributed as an Android package (APK for direct distribution and/or AAB for Google Play).
3. Windows desktop application distributed as a signed installer, primarily an `.exe`.

These are roadmap targets, not claims that the applications or release pipelines already exist.

## Recommended strategy: shared product core
Keep the web application and its domain logic as the primary product. Reuse TypeScript domain packages, validation schemas, API contracts, design tokens and automated tests wherever practical. Keep platform-specific capabilities behind adapters.

### Web
- Next.js App Router, React and TypeScript.
- Responsive desktop/tablet/mobile layouts and installable PWA capabilities where supported.
- Server-side authorization and a stable API contract.
- Supabase PostgreSQL as the canonical persistence layer.

### Android
- Preferred initial route: evaluate Capacitor to package the responsive web experience for Android while exposing native capabilities through explicit plugins.
- Reuse the same authenticated API and canonical data model; do not create an independent Android-only database as a competing source of truth.
- Add native integrations only when justified: secure token storage, share-sheet/document picker, file access, network state and platform notifications.
- Test on real Android devices and multiple screen sizes, including keyboard, touch, offline/error and lifecycle/reconnect behavior.
- Build APK for controlled/direct distribution and AAB for Google Play where applicable. Signing keys and store credentials must be stored securely in CI secrets or the platform's secure signing facility.

### Windows desktop (.exe)
- Preferred initial route: evaluate Tauri for a lightweight native desktop shell around the web UI; retain Electron as an alternative if required capabilities or ecosystem support justify its larger runtime.
- Produce a Windows installer such as `.exe` (for example, an NSIS installer through Tauri) and keep application updates signed and verifiable.
- Integrate platform capabilities behind adapters: file open/save, drag-and-drop, system tray or notifications only if product requirements justify them.
- Do not embed database credentials or privileged server secrets in the desktop bundle. The desktop client must use authenticated server APIs.
- Validate installation, upgrade, rollback, uninstall, deep links, file associations if introduced, crash reporting and offline/error states on supported Windows versions.
- Code signing is recommended for public distribution; certificate cost and signing setup must be assessed before release.

## Cross-platform architecture boundaries
- Shared packages: graph/domain model, graph invariants, schema validation, template contracts, API client, design tokens and pure business rules.
- Platform adapters: secure storage, filesystem, file picker/share, notifications, app lifecycle, network state and update mechanism.
- Server-only code and secrets must never be imported into client bundles.
- Preserve one canonical graph model and one authorization policy across platforms.
- Autosave, idempotency, revision conflicts, import validation and AI proposal/review rules must behave consistently across web and native clients.
- Use capability detection and graceful fallbacks rather than assuming browser and native APIs are identical.

## Delivery sequence
1. **Web MVP:** establish CI, auth/workspace authorization, canonical graph/editor, autosave/recovery, template foundation and JSON round-trip.
2. **Responsive web/PWA evaluation:** validate mobile browser UX and decide which offline/installable capabilities are safe to ship.
3. **Cross-platform readiness:** extract reusable domain/schema/API packages; add platform adapter contracts and contract tests.
4. **Android alpha:** package with the selected wrapper, add essential native integrations, device QA and signed internal builds.
5. **Windows desktop alpha:** package with Tauri (or evidence-based alternative), add file workflows, installer/updater strategy and Windows QA.
6. **Public release readiness:** signing, privacy disclosures, crash/diagnostic policy, release notes, update/recovery testing and platform-specific distribution review.

Android and desktop work may overlap after the shared API and graph contracts stabilize, but must not delay correctness and security of the web MVP.

## CI/CD and release evidence
- Separate build/test jobs for web, Android and Windows; share lint, typecheck, unit tests and domain contract tests.
- Add platform-specific integration and smoke tests; keep signing secrets out of repository files.
- Publish versioned artifacts with checksums and release notes. Verify artifact provenance and installer/package integrity.
- Run migration compatibility tests before server releases; mobile/desktop clients must tolerate supported API evolution.
- Track supported OS versions, minimum app versions, update policy and end-of-support policy.
- Never claim an APK, AAB or EXE is ready until the actual artifact has been built, installed, smoke-tested and verified.

## Key risks and mitigations
- **Web wrapper limitations:** validate performance, canvas rendering, file handling, keyboard shortcuts and lifecycle behavior early on real devices.
- **Platform divergence:** share domain logic and API contracts; keep platform-specific code in adapters.
- **Offline complexity:** begin with clear offline detection and recoverable local drafts; only add full offline synchronization after conflict semantics are specified and tested.
- **Credential exposure:** no database/service-role secrets in clients; use server-side authorization and short-lived sessions.
- **Release signing:** plan key custody, rotation, backups and CI access before public distribution.
- **Store and OS policy changes:** verify current Android store and Windows signing/distribution requirements at release time.

## Acceptance criteria
- Web remains the canonical initial product implementation.
- Android and Windows clients use the same validated domain model and server-side authorization contracts.
- Responsive, accessibility, data integrity, import/export and revision behavior are tested across target surfaces.
- Platform builds are reproducible from documented commands and CI.
- Signed distributable artifacts pass install/upgrade/uninstall and smoke tests before release.
