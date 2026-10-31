import type { MapEdgeDocument, MapNodeDocument } from "./map-document";

/**
 * Canonical graph contract:
 * - parentId represents hierarchy and is independent from visual/cross-link edges.
 * - edges represent cross-links only.
 * - the root is stable ("root") and has no parent.
 */
export type CanonicalTopic = MapNodeDocument & { parentId: string | null };
export type CanonicalCrossLink = MapEdgeDocument & { type: "cross_link" };
export type CanonicalGraph = {
  version: 1;
  title: string;
  nodes: CanonicalTopic[];
  edges: CanonicalCrossLink[];
};

export type TopicInput = {
  id: string;
  parentId: string;
  label: string;
  position: { x: number; y: number };
  notes?: string;
};

function assertPosition(position: { x: number; y: number }): void {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Posisi topik harus berupa koordinat finite.");
  }
}

function assertUniqueTopicId(nodes: CanonicalTopic[], id: string): void {
  if (!id.trim() || nodes.some((node) => node.id === id)) {
    throw new Error("ID topik kosong atau sudah digunakan.");
  }
}

export function assertCanonicalGraph(graph: CanonicalGraph): CanonicalGraph {
  if (graph.version !== 1 || !graph.title.trim()) {
    throw new Error("Identitas dokumen graph tidak valid.");
  }
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    throw new Error("Graph wajib memiliki topik utama.");
  }
  const byId = new Map<string, CanonicalTopic>();
  for (const node of graph.nodes) {
    if (!node.id || byId.has(node.id)) throw new Error("ID topik kosong atau duplikat.");
    assertPosition(node.position);
    if (typeof node.data.label !== "string") throw new Error(`Label topik ${node.id} tidak valid.`);
    byId.set(node.id, node);
  }
  const root = byId.get("root");
  if (!root || root.parentId !== null) throw new Error("Topik root wajib ada dan tidak boleh memiliki parent.");
  for (const node of graph.nodes) {
    if (node.id === "root") continue;
    if (!node.parentId || !byId.has(node.parentId)) {
      throw new Error(`Parent topik ${node.id} tidak tersedia.`);
    }
    const visited = new Set<string>([node.id]);
    let cursor: CanonicalTopic | undefined = node;
    while (cursor.parentId !== null) {
      if (visited.has(cursor.parentId)) throw new Error("Siklus hierarki terdeteksi.");
      visited.add(cursor.parentId);
      cursor = byId.get(cursor.parentId);
      if (!cursor) throw new Error("Rantai parent tidak valid.");
    }
    if (cursor.id !== "root") throw new Error("Setiap topik harus berada di bawah root.");
  }
  const edgeIds = new Set<string>();
  const pairs = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.type !== "cross_link") throw new Error("Edge graph hanya boleh berupa cross_link.");
    if (!edge.id || edgeIds.has(edge.id)) throw new Error("ID cross-link kosong atau duplikat.");
    if (edge.source === edge.target || !byId.has(edge.source) || !byId.has(edge.target)) {
      throw new Error("Cross-link harus menghubungkan dua topik berbeda yang tersedia.");
    }
    const pair = [edge.source, edge.target].sort().join("\u0000");
    if (pairs.has(pair)) throw new Error("Cross-link duplikat ditemukan.");
    edgeIds.add(edge.id);
    pairs.add(pair);
  }
  return graph;
}

export function addChildTopic(graph: CanonicalGraph, input: TopicInput): CanonicalGraph {
  assertCanonicalGraph(graph);
  assertUniqueTopicId(graph.nodes, input.id);
  if (!graph.nodes.some((node) => node.id === input.parentId)) {
    throw new Error("Parent topik tidak ditemukan.");
  }
  assertPosition(input.position);
  if (!input.label.trim()) throw new Error("Nama topik wajib diisi.");
  const node: CanonicalTopic = {
    id: input.id,
    parentId: input.parentId,
    position: input.position,
    data: { label: input.label, ...(input.notes === undefined ? {} : { notes: input.notes }) },
  };
  return { ...graph, nodes: [...graph.nodes, node] };
}

/** Deletes only the selected topic and its true hierarchical descendants. */
export function deleteTopicSubtree(graph: CanonicalGraph, topicId: string): CanonicalGraph {
  assertCanonicalGraph(graph);
  if (topicId === "root") throw new Error("Topik utama tidak dapat dihapus.");
  if (!graph.nodes.some((node) => node.id === topicId)) return graph;
  const removed = new Set<string>([topicId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of graph.nodes) {
      if (node.parentId !== null && removed.has(node.parentId) && !removed.has(node.id)) {
        removed.add(node.id);
        changed = true;
      }
    }
  }
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => !removed.has(node.id)),
    edges: graph.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)),
  };
}

export function reparentTopic(graph: CanonicalGraph, topicId: string, nextParentId: string): CanonicalGraph {
  assertCanonicalGraph(graph);
  if (topicId === "root") throw new Error("Topik utama tidak dapat dipindahkan.");
  if (!graph.nodes.some((node) => node.id === nextParentId)) throw new Error("Parent tujuan tidak ditemukan.");
  if (topicId === nextParentId) throw new Error("Topik tidak dapat menjadi parent dirinya sendiri.");
  const subtree = new Set<string>([topicId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of graph.nodes) {
      if (node.parentId !== null && subtree.has(node.parentId) && !subtree.has(node.id)) {
        subtree.add(node.id);
        changed = true;
      }
    }
  }
  if (subtree.has(nextParentId)) throw new Error("Pemindahan akan membentuk siklus hierarki.");
  return {
    ...graph,
    nodes: graph.nodes.map((node) => node.id === topicId ? { ...node, parentId: nextParentId } : node),
  };
}

export function addCrossLink(
  graph: CanonicalGraph,
  input: { id: string; source: string; target: string; label?: string },
): CanonicalGraph {
  assertCanonicalGraph(graph);
  const edge: CanonicalCrossLink = { ...input, type: "cross_link" };
  return assertCanonicalGraph({ ...graph, edges: [...graph.edges, edge] });
}
