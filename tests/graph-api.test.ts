import { describe, expect, it } from "vitest";
import {
  isSameOriginRequest,
  isUuid,
  mapGraphDatabaseError,
  parseCanonicalGraph,
  parseCreateMapInput,
  parseGraphRpcResult,
  parseRequestId,
  parseRestoreMapInput,
  parseSaveMapInput,
} from "../lib/server/graph-api";

const graph = {
  version: 1 as const,
  title: "Test Map",
  nodes: [
    { id: "root", parentId: null, position: { x: 0, y: 0 }, data: { label: "Root" } },
    { id: "child", parentId: "root", position: { x: 10, y: 20 }, data: { label: "Child", notes: "Notes" } },
  ],
  edges: [{ id: "link-1", source: "root", target: "child", type: "cross_link" as const }],
};

describe("canonical graph API contract", () => {
  it("accepts a valid canonical graph and rejects invalid hierarchy", () => {
    expect(parseCanonicalGraph(graph)).toEqual(graph);
    expect(parseCanonicalGraph({ ...graph, nodes: [{ ...graph.nodes[0], parentId: "missing" }] })).toBeNull();
    expect(parseCanonicalGraph({ ...graph, edges: [{ id: "bad", source: "root", target: "root", type: "cross_link" }] })).toBeNull();
  });

  it("validates create-map input and optional title", () => {
    expect(parseCreateMapInput({
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      graph,
    })).toMatchObject({ workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: null, graph });
    expect(parseCreateMapInput({
      workspaceId: "not-a-uuid",
      graph,
    })).toBeNull();
    expect(parseCreateMapInput({
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: " ",
      graph,
    })).toBeNull();
  });

  it("validates save and restore revision contracts", () => {
    expect(parseSaveMapInput({ expectedRevision: 2, graph, note: "checkpoint" })).toMatchObject({
      expectedRevision: 2,
      note: "checkpoint",
    });
    expect(parseSaveMapInput({ expectedRevision: 0, graph })).toBeNull();
    expect(parseSaveMapInput({ expectedRevision: 1, graph, note: "x".repeat(1001) })).toBeNull();
    expect(parseRestoreMapInput({ sourceRevision: 1, expectedRevision: 3 })).toEqual({
      sourceRevision: 1,
      expectedRevision: 3,
    });
    expect(parseRestoreMapInput({ sourceRevision: 0, expectedRevision: 3 })).toBeNull();
  });

  it("validates idempotency keys and UUIDs", () => {
    expect(parseRequestId("  request-123  ")).toBe("request-123");
    expect(parseRequestId("")).toBeNull();
    expect(parseRequestId("x".repeat(129))).toBeNull();
    expect(parseRequestId("bad\nkey")).toBeNull();
    expect(isUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("maps RPC errors to stable safe HTTP problems", () => {
    expect(mapGraphDatabaseError({ code: "40001", message: "REVISION_CONFLICT" })).toMatchObject({
      status: 409,
      code: "REVISION_CONFLICT",
    });
    expect(mapGraphDatabaseError({ code: "P0002", message: "MAP_NOT_FOUND" })).toMatchObject({
      status: 404,
      code: "MAP_NOT_FOUND",
    });
    expect(mapGraphDatabaseError({ code: "22023", message: "REQUEST_ID_REUSED" })).toMatchObject({
      status: 409,
      code: "REQUEST_ID_REUSED",
    });
    expect(mapGraphDatabaseError({ code: "XX000", message: "secret SQL details" })).toMatchObject({
      status: 500,
      code: "PERSISTENCE_ERROR",
      message: "Perubahan mind map tidak dapat disimpan.",
    });
  });

  it("validates RPC response identity, revision and graph", () => {
    expect(parseGraphRpcResult({
      map_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      revision: 2,
      schema_version: 1,
      graph,
    }, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")).toMatchObject({ revision: 2, schemaVersion: 1 });
    expect(parseGraphRpcResult({
      map_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      revision: 2,
      schema_version: 1,
      graph,
    }, "cccccccc-cccc-4ccc-8ccc-cccccccccccc")).toBeNull();
  });

  it("requires an exact same-origin Origin header for cookie-authenticated mutations", () => {
    expect(isSameOriginRequest(new Request("https://app.example/api/maps", {
      method: "POST",
      headers: { origin: "https://app.example" },
    }))).toBe(true);
    expect(isSameOriginRequest(new Request("https://app.example/api/maps", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    }))).toBe(false);
    expect(isSameOriginRequest(new Request("https://app.example/api/maps", { method: "POST" }))).toBe(false);
  });
});
