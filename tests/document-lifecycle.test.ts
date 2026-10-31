import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  createPersistedMapDocument,
  parseStoredMapDocument,
  serializeMapDocument,
} from "../lib/domain/document-lifecycle";

const nodes: Node[] = [
  { id: "root", position: { x: 0, y: 0 }, data: { label: "Root" } },
  { id: "a", position: { x: 10, y: 10 }, data: { label: "A", notes: "Note" } },
  { id: "b", position: { x: 20, y: 20 }, data: { label: "B" } },
];

const edges: Edge[] = [
  { id: "h1", source: "root", target: "a", type: "smoothstep" },
  { id: "h2", source: "a", target: "b", type: "smoothstep" },
  { id: "x1", source: "root", target: "b", data: { relation: "cross_link" } },
];

describe("document lifecycle", () => {
  it("creates a v2 document with canonical parent relationships", () => {
    const document = createPersistedMapDocument("Lifecycle", nodes, edges);
    expect(document.format).toBe("mindmap-pro");
    expect(document.version).toBe(2);
    expect(document.graph.nodes.find((node) => node.id === "b")?.parentId).toBe("a");
    expect(document.graph.edges).toHaveLength(1);
  });

  it("serializes and restores a v2 document without losing graph semantics", () => {
    const serialized = serializeMapDocument("Lifecycle", nodes, edges);
    const loaded = parseStoredMapDocument(JSON.parse(serialized));
    expect(loaded.migrated).toBe(false);
    expect(loaded.nodes.map((node) => node.id)).toEqual(["root", "a", "b"]);
    expect(loaded.edges.filter((edge) => (edge.data as { relation?: string } | undefined)?.relation === "cross_link")).toHaveLength(1);
    expect(loaded.graph.nodes.find((node) => node.id === "b")?.parentId).toBe("a");
  });

  it("migrates legacy v1 documents when their edges form one tree", () => {
    const loaded = parseStoredMapDocument({
      version: 1,
      title: "Legacy",
      nodes,
      edges: edges.filter((edge) => edge.id !== "x1"),
    });
    expect(loaded.migrated).toBe(true);
    expect(loaded.graph.nodes.find((node) => node.id === "b")?.parentId).toBe("a");
  });

  it("migrates old local drafts without an explicit version", () => {
    const loaded = parseStoredMapDocument({
      title: "Local draft",
      nodes: nodes.slice(0, 2),
      edges: edges.slice(0, 1),
    });
    expect(loaded.migrated).toBe(true);
    expect(loaded.title).toBe("Local draft");
  });

  it("rejects ambiguous legacy hierarchy rather than guessing", () => {
    const ambiguous = [
      ...edges.filter((edge) => edge.id !== "x1"),
      { id: "h3", source: "root", target: "b" },
    ];
    expect(() => parseStoredMapDocument({
      version: 1, title: "Ambiguous", nodes, edges: ambiguous,
    })).toThrow(/lebih dari satu parent/);
  });

  it("rejects unsupported document versions", () => {
    expect(() => parseStoredMapDocument({
      format: "mindmap-pro", version: 99, graph: {},
    })).toThrow(/Versi/);
  });
});
