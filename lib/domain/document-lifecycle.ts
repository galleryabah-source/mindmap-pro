import type { Edge, Node } from "@xyflow/react";
import { fromCanonicalGraph, toCanonicalGraph } from "./graph-adapter";
import { assertCanonicalGraph, type CanonicalGraph } from "./graph-commands";
import { parseMapDocument } from "./map-document";

export type PersistedMapDocument = {
  format: "mindmap-pro";
  version: 2;
  graph: CanonicalGraph;
};

export type LoadedMapDocument = {
  graph: CanonicalGraph;
  nodes: Node[];
  edges: Edge[];
  title: string;
  migrated: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses current v2 documents and migrates legacy v1 / local drafts.
 * Legacy edges are interpreted as hierarchy only when they form one valid tree.
 * Ambiguous legacy graphs are rejected rather than silently reclassified.
 */
export function parseStoredMapDocument(input: unknown): LoadedMapDocument {
  if (!isRecord(input)) throw new Error("Dokumen mind map harus berupa objek JSON.");

  let graph: CanonicalGraph;
  let migrated = false;

  if (input.format === "mindmap-pro" && input.version === 2) {
    graph = assertCanonicalGraph(input.graph as CanonicalGraph);
  } else {
    const legacy = parseMapDocument({
      version: input.version === undefined ? 1 : input.version,
      title: input.title,
      nodes: input.nodes,
      edges: input.edges,
    });
    graph = toCanonicalGraph(legacy.title, legacy.nodes as Node[], legacy.edges as Edge[]);
    migrated = true;
  }

  const visual = fromCanonicalGraph(graph);
  return { graph, ...visual, migrated };
}

export function createPersistedMapDocument(
  title: string,
  nodes: Node[],
  edges: Edge[],
): PersistedMapDocument {
  const graph = toCanonicalGraph(title, nodes, edges);
  return { format: "mindmap-pro", version: 2, graph };
}

export function serializeMapDocument(
  title: string,
  nodes: Node[],
  edges: Edge[],
): string {
  return JSON.stringify(createPersistedMapDocument(title, nodes, edges), null, 2);
}
