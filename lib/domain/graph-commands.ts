import { MAP_LIMITS, type MapEdgeDocument, type MapNodeDocument } from "./map-document";

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
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)
    || Math.abs(position.x) > MAP_LIMITS.coordinateMagnitude
    || Math.abs(position.y) > MAP_LIMITS.coordinateMagnitude) {
    throw new Error("Posisi topik tidak valid atau berada di luar batas koordinat.");
  }
}

function assertUniqueTopicId(nodes: CanonicalTopic[], id: string): void {
  if (!id.trim() || nodes.some((node) => node.id === id)) {
    throw new Error("ID topik kosong atau sudah digunakan.");
  }
}

export function assertCanonicalGraph(graph: CanonicalGraph): CanonicalGraph {
  if (!graph || typeof graph !== "object" || graph.version !== 1
    || typeof graph.title !== "string" || !graph.title.trim()
    || graph.title.length > MAP_LIMITS.titleLength) {
    throw new Error("Identitas dokumen graph tidak valid.");
  }
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0
    || graph.nodes.length > MAP_LIMITS.nodeCount) {
    throw new Error("Graph wajib memiliki 1–5000 topik.");
  }
  if (!Array.isArray(graph.edges) || graph.edges.length > MAP_LIMITS.edgeCount) {
    throw new Error("Jumlah cross-link tidak valid (maksimal 10000).");
  }
  const byId = new Map<string, CanonicalTopic>();
  for (const node of graph.nodes) {
    if (typeof node.id !== "string" || !node.id.trim() || node.id.length > MAP_LIMITS.idLength || byId.has(node.id)) {
      throw new Error("ID topik kosong, terlalu panjang, atau duplikat.");
    }
    assertPosition(node.position);
    if (!node.data || typeof node.data !== "object"
      || typeof node.data.label !== "string" || node.data.label.length > MAP_LIMITS.labelLength) {
      throw new Error(`Label topik ${node.id} tidak valid.`);
    }
    if (node.data.notes !== undefined
      && (typeof node.data.notes !== "string" || node.data.notes.length > MAP_LIMITS.notesLength)) {
      throw new Error(`Catatan topik ${node.id} tidak valid.`);
    }
    byId.set(node.id, node);
  }
  const root = byId.get("root");
  if (!root || root.parentId !== null) throw new Error("Topik root wajib ada dan tidak boleh memiliki parent.");
  const resolved = new Set<string>(["root"]);
  for (const node of graph.nodes) {
    if (node.id === "root" || resolved.has(node.id)) continue;
    const visiting = new Set<string>();
    const path: string[] = [];
    let cursor: CanonicalTopic = node;
    while (cursor.id !== "root" && !resolved.has(cursor.id)) {
      if (visiting.has(cursor.id)) throw new Error("Siklus hierarki terdeteksi.");
      visiting.add(cursor.id);
      path.push(cursor.id);
      if (typeof cursor.parentId !== "string" || !cursor.parentId) {
        throw new Error(`Parent topik ${cursor.id} tidak tersedia.`);
      }
      const parent = byId.get(cursor.parentId);
      if (!parent) throw new Error(`Parent topik ${cursor.id} tidak tersedia.`);
      cursor = parent;
    }
    if (cursor.id !== "root" && !resolved.has(cursor.id)) {
      throw new Error("Setiap topik harus berada di bawah root.");
    }
    for (const id of path) resolved.add(id);
  }
  const edgeIds = new Set<string>();
  const pairs = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.type !== "cross_link") throw new Error("Edge graph hanya boleh berupa cross_link.");
    if (typeof edge.id !== "string" || !edge.id.trim() || edge.id.length > MAP_LIMITS.idLength || edgeIds.has(edge.id)) {
      throw new Error("ID cross-link kosong, terlalu panjang, atau duplikat.");
    }
    if (edge.label !== undefined && (typeof edge.label !== "string" || edge.label.length > 500)) {
      throw new Error("Label cross-link tidak valid.");
    }
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
  return assertCanonicalGraph({ ...graph, nodes: [...graph.nodes, node] });
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
  return assertCanonicalGraph({
    ...graph,
    nodes: graph.nodes.filter((node) => !removed.has(node.id)),
    edges: graph.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)),
  });
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
  return assertCanonicalGraph({
    ...graph,
    nodes: graph.nodes.map((node) => node.id === topicId ? { ...node, parentId: nextParentId } : node),
  });
}

export function addCrossLink(
  graph: CanonicalGraph,
  input: { id: string; source: string; target: string; label?: string },
): CanonicalGraph {
  assertCanonicalGraph(graph);
  const edge: CanonicalCrossLink = { ...input, type: "cross_link" };
  return assertCanonicalGraph({ ...graph, edges: [...graph.edges, edge] });
}

/**
 * Resolves a visual subtree using hierarchy edges only.
 * Cross-links are references and are deliberately excluded from cascading operations.
 */
export function collectHierarchicalSubtreeIds(
  edges: Array<{ source: string; target: string; data?: { relation?: string } }>,
  topicId: string,
): Set<string> {
  const hierarchyEdges = edges.filter((edge) => edge.data?.relation !== "cross_link");
  const removed = new Set<string>([topicId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of hierarchyEdges) {
      if (removed.has(edge.source) && !removed.has(edge.target)) {
        removed.add(edge.target);
        changed = true;
      }
    }
  }
  return removed;
}
