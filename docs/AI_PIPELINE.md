# AI and Document-to-Map Pipeline

## Stages
1. Validate upload, checksum, MIME, size, ownership and scan status.
2. Malware scan and file-specific validation.
3. Extract text and page/section boundaries; OCR only when needed and within limits.
4. Normalize while retaining provenance: page, heading, span and extraction confidence.
5. Chunk with overlap and strict size limits.
6. Generate a structured draft of root, topics, explanations, edges and source references.
7. Validate schema, node/depth limits, duplicates, references and graph invariants.
8. Show preview/warnings; user can edit, accept, reject or regenerate.
9. Persist accepted map with provenance, revision and audit event.
10. Delete temporary artifacts according to retention policy.

## Output contract
- title
- topics: draft ID, parent draft ID, label, explanation and source references
- edges: source, target, relation type, label and confidence
- warnings: low OCR confidence, missing text, unsupported content or truncation
- provenance: file ID, page/section, offsets/quote span and extraction method

Check every source reference against extracted source bounds. Never invent page citations or claim unsupported text is a direct quote.

## Evaluation
Maintain a versioned corpus of long/multilingual PDFs, tables, scans, malformed files and prompt-injection examples. Measure structural validity, concept coverage, redundancy, hierarchy usefulness, citation correctness, source faithfulness, latency, cost and human acceptance/edit distance.

## Provider adapter and controls
Keep provider keys server-side. Record provider/model/version, usage, timeout and error class. Bound per-file/page/character limits, workspace quota, concurrency and retries. Require explicit user action for costly operations. Cache only where privacy boundaries permit.
