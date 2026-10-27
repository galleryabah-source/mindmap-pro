# Canonical Graph Validation Contract

MindMap Pro treats imported, restored, and persisted map documents as untrusted input. Every entry path must call the same versioned domain validator before the document is accepted by the application service.

## Required invariants

- The document uses a supported schema version and a non-empty bounded title.
- The node collection is bounded, has unique stable identifiers, and contains the required `root` node.
- Node identifiers and edge identifiers/endpoints are bounded and contain no ASCII control characters.
- Coordinates are finite and remain inside the configured coordinate bounds.
- Node labels, notes, edge labels, styles, and metadata are type-checked and bounded.
- Every edge endpoint resolves to a node in the same document.
- Self-links and duplicate edge identifiers or duplicate directed edge tuples are rejected.
- Edge type is a non-empty bounded string.
- The validator returns a canonical versioned document or rejects the entire input; partial acceptance is not allowed.

## Integration requirements

- JSON import/export, browser recovery, cloud persistence, AI-generated maps, and future collaboration must share this validator or a compatible server-side implementation.
- Client-side validation is a usability control, not an authorization boundary. Server-side validation and workspace authorization remain mandatory.
- Changes to this contract require regression tests for valid documents, malformed input, boundary limits, duplicate identities, and graph-reference integrity.
- Schema changes must be versioned and include an explicit migration/compatibility strategy.
