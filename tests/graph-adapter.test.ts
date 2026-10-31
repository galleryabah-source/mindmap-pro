import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { fromCanonicalGraph, toCanonicalGraph } from "../lib/domain/graph-adapter";

const nodes: Node[] = [
  { id: "root", position: { x: 0, y: 0 }, data: { label: "Root" } },
  { id: "a", position: { x: 10, y: 10 }, data: { label: "A", notes: "Detail" } },
  { id: "b", position: { x: 20, y: 20 }, data: { label: "B" } },
];

const edges: Edge[] = [
  { id: "h1", source: "root", target: "a", type: "smoothstep" },
  { id: "h2", source: "a", target: "b", type: "smoothstep" },
  { id: "x1", source: "root", target: "b", type: "smoothstep", data: { relation: "cross_link" } },
];

describe("canonical graph adapter", () => {
  it("separates parent hierarchy from cross-links", () => {
    const graph = toCanonicalGraph("Adapter test", nodes, edges);
    expect(graph.nodes.find((node) => node.id === "a")?.parentId).toBe("root");
    expect(graph.nodes.find((node) => node.id === "b")?.parentId).toBe("a");
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].type).toBe("cross_link");
  });

  it("round-trips canonical hierarchy and cross-link metadata", () => {
    const graph = toCanonicalGraph("Adapter test", nodes, edges);
    const visual = fromCanonicalGraph(graph);
    const restored = toCanonicalGraph(visual.title, visual.nodes, visual.edges);
    expect(restored.nodes.map((node) => [node.id, node.parentId])).toEqual(
      graph.nodes.map((node) => [node.id, node.parentId]),
    );
    expect(restored.edges.map((edge) => [edge.source, edge.target])).toEqual([["root", "b"]]);
  });

  it("preserves custom cross-link style and label across adapter round trips", () => {
    const styledEdges: Edge[] = [
      edges[0],
      edges[1],
      {
        id: "x1",
        source: "root",
        target: "b",
        type: "smoothstep",
        label: "Related",
        data: { relation: "cross_link" },
        style: { stroke: "#123456", strokeWidth: 4, strokeDasharray: "2 3" },
      },
    ];
    const canonical = toCanonicalGraph("Adapter test", nodes, styledEdges);
    const visual = fromCanonicalGraph(canonical);
    const restored = toCanonicalGraph(visual.title, visual.nodes, visual.edges);
    expect(restored.edges[0]).toMatchObject({
      label: "Related",
      style: { stroke: "#123456", strokeWidth: 4, strokeDasharray: "2 3" },
    });
  });

  it("rejects a node with no hierarchy parent", () => {
    expect(() => toCanonicalGraph("Invalid", nodes, [edges[0]])).toThrow(/Parent/);
  });

  it("rejects multiple hierarchy parents", () => {
    const invalid = [...edges, { id: "h3", source: "root", target: "b" }];
    expect(() => toCanonicalGraph("Invalid", nodes, invalid)).toThrow(/lebih dari satu parent/);
  });

  it("rejects hierarchy cycles", () => {
    const cyclic = [
      { id: "h1", source: "a", target: "b" },
      { id: "h2", source: "b", target: "a" },
      { id: "x", source: "root", target: "a", data: { relation: "cross_link" } },
    ];
    expect(() => toCanonicalGraph("Invalid", nodes, cyclic)).toThrow(/Parent|siklus/i);
  });
});
