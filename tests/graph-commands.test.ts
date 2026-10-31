import { describe, expect, it } from "vitest";
import {
  addChildTopic,
  collectHierarchicalSubtreeIds,
  addCrossLink,
  assertCanonicalGraph,
  deleteTopicSubtree,
  moveTopic,
  reparentTopic,
  type CanonicalGraph,
} from "../lib/domain/graph-commands";

const graph = (): CanonicalGraph => ({
  version: 1,
  title: "Test map",
  nodes: [
    { id: "root", parentId: null, position: { x: 0, y: 0 }, data: { label: "Root" } },
    { id: "a", parentId: "root", position: { x: 10, y: 10 }, data: { label: "A" } },
    { id: "b", parentId: "a", position: { x: 20, y: 20 }, data: { label: "B" } },
    { id: "c", parentId: "root", position: { x: 30, y: 30 }, data: { label: "C" } },
  ],
  edges: [{ id: "x1", source: "b", target: "c", type: "cross_link" }],
});

describe("canonical graph commands", () => {
  it("validates stable root, parent references and cross-links", () => {
    expect(assertCanonicalGraph(graph()).nodes).toHaveLength(4);
  });

  it("adds a child with an explicit parent independent from cross-links", () => {
    const next = addChildTopic(graph(), {
      id: "d", parentId: "c", label: "D", position: { x: 40, y: 40 },
    });
    expect(next.nodes.find((node) => node.id === "d")?.parentId).toBe("c");
    expect(next.edges).toHaveLength(1);
  });

  it("deletes only hierarchical descendants and cleans incident cross-links", () => {
    const next = deleteTopicSubtree(graph(), "a");
    expect(next.nodes.map((node) => node.id)).toEqual(["root", "c"]);
    expect(next.edges).toHaveLength(0);
  });

  it("does not delete a node reachable only through a cross-link", () => {
    const next = deleteTopicSubtree(graph(), "b");
    expect(next.nodes.map((node) => node.id)).toEqual(["root", "a", "c"]);
  });

  it("rejects reparenting that would create a hierarchy cycle", () => {
    expect(() => reparentTopic(graph(), "a", "b")).toThrow(/siklus/i);
  });

  it("allows reparenting to a different valid branch", () => {
    const next = reparentTopic(graph(), "a", "c");
    expect(next.nodes.find((node) => node.id === "a")?.parentId).toBe("c");
  });

  it("rejects duplicate undirected cross-links", () => {
    expect(() => addCrossLink(graph(), { id: "x2", source: "c", target: "b" })).toThrow(/duplikat/i);
  });

  it("rejects missing parents and disconnected hierarchy", () => {
    const invalid = graph();
    invalid.nodes[1].parentId = "missing";
    expect(() => assertCanonicalGraph(invalid)).toThrow(/Parent/);
  });

  it("does not cascade visual deletion across cross-links", () => {
    const ids = collectHierarchicalSubtreeIds([
      { source: "a", target: "b" },
      { source: "b", target: "c", data: { relation: "cross_link" } },
      { source: "a", target: "d" },
    ], "a");
    expect([...ids].sort()).toEqual(["a", "b", "d"]);
  });

  it("rejects coordinates outside the document safety boundary", () => {
    const invalid = graph();
    invalid.nodes[1].position.x = 10_000_001;
    expect(() => assertCanonicalGraph(invalid)).toThrow(/koordinat/i);
  });

  it("rejects oversized topic notes", () => {
    const invalid = graph();
    invalid.nodes[1].data.notes = "x".repeat(50_001);
    expect(() => assertCanonicalGraph(invalid)).toThrow(/Catatan/i);
  });

  it("validates mutations against the same canonical limits", () => {
    expect(() => addChildTopic(graph(), {
      id: "too-long-notes",
      parentId: "root",
      label: "Valid label",
      position: { x: 1, y: 1 },
      notes: "x".repeat(50_001),
    })).toThrow(/Catatan/i);
  });

  it("rejects unsafe or excessively nested canonical metadata", () => {
    const invalid = graph();
    invalid.nodes[1].data.extra = { nested: { callback: () => "unsafe" } };
    expect(() => assertCanonicalGraph(invalid)).toThrow(/Metadata/);
  });

  it("rejects malformed cross-link endpoints", () => {
    const invalid = graph();
    invalid.edges[0].source = "" as unknown as string;
    expect(() => assertCanonicalGraph(invalid)).toThrow(/Endpoint/);
  });

  it("rejects unsafe cross-link style metadata", () => {
    const invalid = graph();
    invalid.edges[0].style = { custom: () => "unsafe" };
    expect(() => assertCanonicalGraph(invalid)).toThrow(/Cross-link/);
  });

  it("moves a topic without changing its parent or cross-links", () => {
    const next = moveTopic(graph(), "b", { x: 120, y: 240 });
    expect(next.nodes.find((node) => node.id === "b")).toMatchObject({
      parentId: "a",
      position: { x: 120, y: 240 },
    });
    expect(next.edges).toEqual(graph().edges);
  });

  it("rejects invalid topic movement coordinates", () => {
    expect(() => moveTopic(graph(), "b", { x: Number.NaN, y: 0 })).toThrow(/Posisi/);
  });

  it("rejects root deletion", () => {
    expect(() => deleteTopicSubtree(graph(), "root")).toThrow(/utama/);
  });
});
