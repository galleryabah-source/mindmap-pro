import { describe, expect, it } from "vitest";
import {
  isUuid,
  isValidWriteResponse,
  mapSupabaseError,
  parseCommitMapGraphInput,
  parseCreateMapInput,
  parseJsonBody,
  parsePersistedDocument,
} from "@/lib/server/persistence-api";

const validDocument = {
  format: "mindmap-pro",
  version: 2,
  graph: {
    version: 1,
    title: "Test map",
    nodes: [
      { id: "root", parentId: null, position: { x: 0, y: 0 }, data: { label: "Root" } },
      { id: "topic-a", parentId: "root", position: { x: 100, y: 100 }, data: { label: "Topic A" } },
    ],
    edges: [],
  },
};

const workspaceId = "00000000-0000-4000-8000-000000000001";
const requestId = "00000000-0000-4000-8000-000000000002";
const mapId = "00000000-0000-4000-8000-000000000003";
const snapshotId = "00000000-0000-4000-8000-000000000004";

describe("persistence API contract", () => {
  it("accepts RFC 4122 UUID identifiers", () => {
    expect(isUuid(workspaceId)).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it("parses a canonical v2 graph document", () => {
    expect(parsePersistedDocument(validDocument)?.graph.nodes).toHaveLength(2);
  });

  it("rejects a legacy or malformed document envelope", () => {
    expect(parsePersistedDocument({ version: 1, title: "legacy", nodes: [], edges: [] })).toBeNull();
    expect(parsePersistedDocument({ ...validDocument, graph: { ...validDocument.graph, nodes: [] } })).toBeNull();
  });

  it("validates map creation fields and applies a safe description default", () => {
    const input = parseCreateMapInput({ workspaceId, requestId, document: validDocument });
    expect(input?.description).toBe("");
    expect(input?.workspaceId).toBe(workspaceId);
  });

  it("rejects invalid workspace, request, description and document values", () => {
    expect(parseCreateMapInput({ workspaceId: "x", requestId, document: validDocument })).toBeNull();
    expect(parseCreateMapInput({ workspaceId, requestId: "x", document: validDocument })).toBeNull();
    expect(parseCreateMapInput({ workspaceId, requestId, document: validDocument, description: "x".repeat(10001) })).toBeNull();
  });

  it("validates graph commits and requires a positive expected revision", () => {
    expect(parseCommitMapGraphInput({ expectedRevision: 1, requestId, document: validDocument })?.note).toBe("");
    expect(parseCommitMapGraphInput({ expectedRevision: 0, requestId, document: validDocument })).toBeNull();
    expect(parseCommitMapGraphInput({ expectedRevision: 1.5, requestId, document: validDocument })).toBeNull();
  });

  it("rejects JSON parse failures and bodies larger than 10 MB", () => {
    expect(parseJsonBody("{").ok).toBe(false);
    expect(parseJsonBody("x".repeat(10 * 1024 * 1024 + 1))).toMatchObject({ ok: false, problem: { status: 413 } });
  });

  it("maps known database errors to stable HTTP semantics", () => {
    expect(mapSupabaseError({ code: "42501" }).status).toBe(403);
    expect(mapSupabaseError({ code: "23505" }).status).toBe(409);
    expect(mapSupabaseError({ code: "40001" }).status).toBe(409);
    expect(mapSupabaseError({ code: "22023" }).status).toBe(422);
    expect(mapSupabaseError({ code: "XX000", message: "sensitive internals" })).toMatchObject({
      status: 500,
      message: "Operasi penyimpanan tidak dapat diselesaikan.",
    });
  });

  it("validates RPC write responses before returning them to callers", () => {
    expect(isValidWriteResponse({ mapId, revision: 1, snapshotId, requestId }, requestId)).toBe(true);
    expect(isValidWriteResponse({ mapId, revision: 0, snapshotId, requestId }, requestId)).toBe(false);
    expect(isValidWriteResponse({ mapId, revision: 1, snapshotId, requestId: workspaceId }, requestId)).toBe(false);
  });
});
