import type { Edge, Node } from "@xyflow/react";
import {
  assertCanonicalGraph,
  type CanonicalGraph,
} from "./graph-commands";

type VisualEdge = Edge & { data?: Record<string, unknown> };

/**
 * Converts the current React Flow representation into the canonical graph.
 * Every non-cross-link edge is treated as a hierarchy edge and must form
 * exactly one rooted tree. Cross-links never participate in parent resolution.
 */
export function toCanonicalGraph(
  title: string,
  nodes: Node[],
  edges: VisualEdge[],
): CanonicalGraph {
  const parentById = new Map<string, string>();
  const crossLinks: CanonicalGraph["edges"] = [];

  for (const edge of edges) {
    if ((edge.data as { relation?: string } | undefined)?.relation === "cross_link") {
      crossLinks.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "cross_link",
        ...(typeof edge.label === "string" ? { label: edge.label } : {}),
        ...(edge.style ? { style: edge.style as Record<string, unknown> } : {}),
      });
      continue;
    }
    if (edge.target === "root") {
      throw new Error("Topik root tidak boleh memiliki parent hierarki.");
    }
    if (parentById.has(edge.target)) {
      throw new Error(`Topik ${edge.target} memiliki lebih dari satu parent hierarki.`);
    }
    parentById.set(edge.target, edge.source);
  }

  const canonical: CanonicalGraph = {
    version: 1,
    title,
    nodes: nodes.map((node) => ({
      ...node,
      parentId: node.id === "root" ? null : parentById.get(node.id) ?? null,
      position: node.position,
      data: node.data as { label: string; notes?: string; [key: string]: unknown },
    })),
    edges: crossLinks,
  };

  return assertCanonicalGraph(canonical);
}

/** Converts the canonical graph back into React Flow nodes and visual edges. */
export function fromCanonicalGraph(graph: CanonicalGraph): {
  nodes: Node[];
  edges: Edge[];
  title: string;
} {
  const valid = assertCanonicalGraph(graph);
  const nodes: Node[] = valid.nodes.map((topic) => {
    const node = Object.fromEntries(
      Object.entries(topic).filter(([key]) => key !== "parentId"),
    );
    return node as Node;
  });
  const hierarchyEdges: Edge[] = valid.nodes
    .filter((node) => node.parentId !== null)
    .map((node) => ({
      id: `hierarchy:${node.parentId}:${node.id}`,
      source: node.parentId as string,
      target: node.id,
      type: "smoothstep",
      style: { stroke: "#a5a7c7", strokeWidth: 2 },
    }));
  const crossLinkEdges: Edge[] = valid.edges.map((edge) => ({
    ...edge,
    type: "smoothstep",
    data: { relation: "cross_link" },
    style: edge.style ?? { stroke: "#9294bd", strokeWidth: 2, strokeDasharray: "5 4" },
  }));
  return { nodes, edges: [...hierarchyEdges, ...crossLinkEdges], title: valid.title };
}
