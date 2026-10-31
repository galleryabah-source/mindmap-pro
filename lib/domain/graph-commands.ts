import { isSafeJsonValue, MAP_LIMITS, type MapEdgeDocument, type MapNodeDocument } from "./map-document";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertPosition(position: { x: number; y: number }): void {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)
    || Math.abs(position.x) > MAP_LIMITS.coordinateMagnitude
    || Math.abs(position.y) > MAP_LIMITS.coordinateMagnitude) {
    throw new Error("Posisi topik tidak valid atau berada di luar batas koordinat.");
  }
}

function collectDescendantIds(nodes: CanonicalTopic[], topicId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId === null) continue;
    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node.id);
    childrenByParent.set(node.parentId, children);
  }
  const descendants = new Set<string>([topicId]);
  const queue = [topicId];
  for (let index = 0; index < queue.length; index += 1) {
    for (const childId of childrenByParent.get(queue[index]) ?? []) {
      if (descendants.has(childId)) continue;
      descendants.add(childId);
      queue.push(childId);
    }
  }
  return descendants;
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
    if (!isRecord(node)) throw new Error("Struktur topik canonical tidak valid.");
    if (typeof node.id !== "string" || !node.id.trim() || node.id.length > MAP_LIMITS.idLength || byId.has(node.id)) {
      throw new Error("ID topik kosong, terlalu panjang, atau duplikat.");
    }
    assertPosition(node.position);
    if (!isRecord(node.data)
      || typeof node.data.label !== "string" || node.data.label.length > MAP_LIMITS.labelLength) {
      throw new Error(`Label topik ${node.id} tidak valid.`);
    }
    if (node.data.notes !== undefined
      && (typeof node.data.notes !== "string" || node.data.notes.length > MAP_LIMITS.notesLength)) {
      throw new Error(`Catatan topik ${node.id} tidak valid.`);
    }
    if (!isSafeJsonValue(Object.fromEntries(Object.entries(node).filter(([, value]) => value !== undefined)))
      || !isSafeJsonValue(node.data)
      || (node.style !== undefined && (!isRecord(node.style) || !isSafeJsonValue(node.style)))) {
      throw new Error(`Metadata topik ${node.id} terlalu kompleks atau tidak aman.`);
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
  const hierarchyEdgeIds = new Set(
    graph.nodes
      .filter((node) => node.parentId !== null)
      .map((node) => `hierarchy:${node.parentId}:${node.id}`),
  );
  const edgeIds = new Set<string>();
  const pairs = new Set<string>();
  for (const edge of graph.edges) {
    if (!isRecord(edge)) throw new Error("Struktur cross-link canonical tidak valid.");
    if (edge.type !== "cross_link") throw new Error("Edge graph hanya boleh berupa cross_link.");
    if (typeof edge.id !== "string" || !edge.id.trim() || edge.id.length > MAP_LIMITS.idLength || edgeIds.has(edge.id)) {
      throw new Error("ID cross-link kosong, terlalu panjang, atau duplikat.");
    }
    if (hierarchyEdgeIds.has(edge.id)) {
      throw new Error("ID cross-link bertabrakan dengan ID edge hierarki.");
    }
    if (typeof edge.source !== "string" || !edge.source.trim() || edge.source.length > MAP_LIMITS.idLength
      || typeof edge.target !== "string" || !edge.target.trim() || edge.target.length > MAP_LIMITS.idLength) {
      throw new Error("Endpoint cross-link tidak valid.");
    }
    if (edge.label !== undefined && (typeof edge.label !== "string" || edge.label.length > 500)) {
      throw new Error("Label cross-link tidak valid.");
    }
    if (!isSafeJsonValue(Object.fromEntries(Object.entries(edge).filter(([, value]) => value !== undefined)))
      || (edge.style !== undefined && (!isRecord(edge.style) || !isSafeJsonValue(edge.style)))
      || edge.source === edge.target || !byId.has(edge.source) || !byId.has(edge.target)) {
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
  if (!isRecord(input) || typeof input.id !== "string" || typeof input.parentId !== "string"
    || typeof input.label !== "string" || !input.position || typeof input.position !== "object") {
    throw new Error("Input topik baru tidak valid.");
  }
  assertUniqueTopicId(graph.nodes, input.id);
  if (!graph.nodes.some((node) => node.id === input.parentId)) {
    throw new Error("Parent topik tidak ditemukan.");
  }
  assertPosition(input.position);
  if (!input.label.trim() || input.label.length > MAP_LIMITS.labelLength) throw new Error("Nama topik wajib diisi dan maksimal 2000 karakter.");
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
  const removed = collectDescendantIds(graph.nodes, topicId);
  return assertCanonicalGraph({
    ...graph,
    nodes: graph.nodes.filter((node) => !removed.has(node.id)),
    edges: graph.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)),
  });
}

export function reparentTopic(graph: CanonicalGraph, topicId: string, nextParentId: string): CanonicalGraph {
  assertCanonicalGraph(graph);
  if (topicId === "root") throw new Error("Topik utama tidak dapat dipindahkan.");
  if (!graph.nodes.some((node) => node.id === topicId)) throw new Error("Topik yang akan dipindahkan tidak ditemukan.");
  if (!graph.nodes.some((node) => node.id === nextParentId)) throw new Error("Parent tujuan tidak ditemukan.");
  if (topicId === nextParentId) throw new Error("Topik tidak dapat menjadi parent dirinya sendiri.");
  const subtree = collectDescendantIds(graph.nodes, topicId);
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
  if (!isRecord(input)
    || Object.keys(input).some((key) => !["id", "source", "target", "label"].includes(key))
    || typeof input.id !== "string" || typeof input.source !== "string"
    || typeof input.target !== "string"
    || (input.label !== undefined && typeof input.label !== "string")) {
    throw new Error("Input cross-link tidak valid.");
  }
  const edge: CanonicalCrossLink = {
    id: input.id,
    source: input.source,
    target: input.target,
    type: "cross_link",
    ...(input.label === undefined ? {} : { label: input.label }),
  };
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
  const childrenByParent = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.data?.relation === "cross_link") continue;
    const children = childrenByParent.get(edge.source) ?? [];
    children.push(edge.target);
    childrenByParent.set(edge.source, children);
  }
  const removed = new Set<string>([topicId]);
  const queue = [topicId];
  for (let index = 0; index < queue.length; index += 1) {
    for (const childId of childrenByParent.get(queue[index]) ?? []) {
      if (removed.has(childId)) continue;
      removed.add(childId);
      queue.push(childId);
    }
  }
  return removed;
}

/** Updates a topic's canvas position without changing its hierarchy or links. */
export function moveTopic(
  graph: CanonicalGraph,
  topicId: string,
  position: { x: number; y: number },
): CanonicalGraph {
  assertCanonicalGraph(graph);
  const topic = graph.nodes.find((node) => node.id === topicId);
  if (!topic) throw new Error("Topik yang akan dipindahkan tidak ditemukan.");
  assertPosition(position);
  return assertCanonicalGraph({
    ...graph,
    nodes: graph.nodes.map((node) => node.id === topicId
      ? { ...node, position: { x: position.x, y: position.y } }
      : node),
  });
}

/** Updates editable topic content while preserving identity, hierarchy and visual position. */
export function updateTopicContent(
  graph: CanonicalGraph,
  topicId: string,
  patch: { label?: string; notes?: string },
): CanonicalGraph {
  assertCanonicalGraph(graph);
  const current = graph.nodes.find((node) => node.id === topicId);
  if (!current) throw new Error("Topik yang akan diperbarui tidak ditemukan.");
  if (!isRecord(patch)
    || Object.keys(patch).some((key) => key !== "label" && key !== "notes")) {
    throw new Error("Perubahan konten topik tidak valid.");
  }
  if (patch.label !== undefined
    && (typeof patch.label !== "string" || patch.label.length > MAP_LIMITS.labelLength)) {
    throw new Error("Nama topik tidak valid atau melebihi batas 2000 karakter.");
  }
  if (patch.notes !== undefined
    && (typeof patch.notes !== "string" || patch.notes.length > MAP_LIMITS.notesLength)) {
    throw new Error("Catatan topik tidak valid atau melebihi batas 50000 karakter.");
  }
  return assertCanonicalGraph({
    ...graph,
    nodes: graph.nodes.map((node) => node.id === topicId
      ? { ...node, data: { ...node.data, ...patch } }
      : node),
  });
}

/** Removes selected cross-links without allowing hierarchy edges to be detached. */
export function deleteCrossLinks(graph: CanonicalGraph, edgeIds: string[]): CanonicalGraph {
  assertCanonicalGraph(graph);
  if (!Array.isArray(edgeIds) || edgeIds.some((id) => typeof id !== "string")) {
    throw new Error("Daftar cross-link yang akan dihapus tidak valid.");
  }
  const requested = new Set(edgeIds);
  const existing = new Set(graph.edges.map((edge) => edge.id));
  for (const id of requested) {
    if (!existing.has(id)) throw new Error("Cross-link yang akan dihapus tidak ditemukan.");
  }
  return assertCanonicalGraph({
    ...graph,
    edges: graph.edges.filter((edge) => !requested.has(edge.id)),
  });
}
