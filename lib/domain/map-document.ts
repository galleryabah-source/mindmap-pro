export type MapNodeDocument = {
  id: string;
  position: { x: number; y: number };
  data: { label: string; notes?: string; [key: string]: unknown };
  type?: string;
  style?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MapEdgeDocument = {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  style?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MapDocument = {
  version: 1;
  title: string;
  nodes: MapNodeDocument[];
  edges: MapEdgeDocument[];
};

export const MAP_LIMITS = {
  titleLength: 240,
  nodeCount: 5000,
  edgeCount: 10000,
  idLength: 128,
  labelLength: 2000,
  notesLength: 50000,
  coordinateMagnitude: 10_000_000,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, max: number, allowEmpty = true): value is string {
  return typeof value === "string" && value.length <= max && (allowEmpty || value.trim().length > 0);
}

export function isSafeJsonValue(value: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 1000 && value.every((item) => isSafeJsonValue(item, depth + 1));
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 200 && entries.every(([key, item]) => key.length <= 200 && isSafeJsonValue(item, depth + 1));
}

export function parseMapDocument(input: unknown): MapDocument {
  if (!isRecord(input)) throw new Error("Dokumen mind map harus berupa objek JSON.");
  if (input.version !== 1) throw new Error("Versi dokumen tidak didukung.");
  if (!isBoundedString(input.title, MAP_LIMITS.titleLength, false)) throw new Error("Judul mind map wajib diisi dan maksimal 240 karakter.");
  if (!Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > MAP_LIMITS.nodeCount) {
    throw new Error("Jumlah topik tidak valid (1–5000).");
  }
  if (!Array.isArray(input.edges) || input.edges.length > MAP_LIMITS.edgeCount) {
    throw new Error("Jumlah koneksi tidak valid (maksimal 10000).");
  }

  const ids = new Set<string>();
  const nodes: MapNodeDocument[] = input.nodes.map((candidate, index) => {
    if (!isRecord(candidate)) throw new Error(`Topik ke-${index + 1} tidak valid.`);
    if (!isBoundedString(candidate.id, MAP_LIMITS.idLength, false)) throw new Error(`ID topik ke-${index + 1} tidak valid.`);
    if (ids.has(candidate.id)) throw new Error(`ID topik duplikat: ${candidate.id}.`);
    ids.add(candidate.id);

    if (!isRecord(candidate.position)) throw new Error(`Posisi topik ${candidate.id} tidak valid.`);
    const { x, y } = candidate.position;
    if (typeof x !== "number" || !Number.isFinite(x) || typeof y !== "number" || !Number.isFinite(y)
      || Math.abs(x) > MAP_LIMITS.coordinateMagnitude || Math.abs(y) > MAP_LIMITS.coordinateMagnitude) {
      throw new Error(`Koordinat topik ${candidate.id} di luar batas.`);
    }
    if (!isRecord(candidate.data)) throw new Error(`Data topik ${candidate.id} tidak valid.`);
    if (!isBoundedString(candidate.data.label, MAP_LIMITS.labelLength)) throw new Error(`Nama topik ${candidate.id} terlalu panjang atau tidak valid.`);
    if (candidate.data.notes !== undefined && !isBoundedString(candidate.data.notes, MAP_LIMITS.notesLength)) {
      throw new Error(`Catatan topik ${candidate.id} terlalu panjang atau tidak valid.`);
    }
    if (candidate.style !== undefined && (!isRecord(candidate.style) || !isSafeJsonValue(candidate.style))) {
      throw new Error(`Gaya topik ${candidate.id} tidak valid.`);
    }
    if (!isSafeJsonValue(candidate.data)) throw new Error(`Metadata topik ${candidate.id} terlalu kompleks.`);

    return candidate as unknown as MapNodeDocument;
  });

  if (!ids.has("root")) throw new Error("Dokumen harus memiliki topik utama dengan ID 'root'.");

  const edgeIds = new Set<string>();
  const pairs = new Set<string>();
  const edges: MapEdgeDocument[] = input.edges.map((candidate, index) => {
    if (!isRecord(candidate)) throw new Error(`Koneksi ke-${index + 1} tidak valid.`);
    if (!isBoundedString(candidate.id, MAP_LIMITS.idLength, false)
      || !isBoundedString(candidate.source, MAP_LIMITS.idLength, false)
      || !isBoundedString(candidate.target, MAP_LIMITS.idLength, false)) {
      throw new Error(`Identitas koneksi ke-${index + 1} tidak valid.`);
    }
    if (edgeIds.has(candidate.id)) throw new Error(`ID koneksi duplikat: ${candidate.id}.`);
    edgeIds.add(candidate.id);
    if (candidate.source === candidate.target) throw new Error("Koneksi ke dirinya sendiri tidak diizinkan.");
    if (!ids.has(candidate.source) || !ids.has(candidate.target)) throw new Error("Koneksi merujuk ke topik yang tidak tersedia.");
    const pair = `${candidate.source}\u0000${candidate.target}\u0000${String(candidate.type ?? "default")}`;
    if (pairs.has(pair)) throw new Error("Koneksi duplikat ditemukan.");
    pairs.add(pair);
    if (candidate.label !== undefined && !isBoundedString(candidate.label, 500)) throw new Error("Label koneksi terlalu panjang.");
    if (candidate.style !== undefined && (!isRecord(candidate.style) || !isSafeJsonValue(candidate.style))) {
      throw new Error("Gaya koneksi tidak valid.");
    }
    return candidate as unknown as MapEdgeDocument;
  });

  return { version: 1, title: input.title, nodes, edges };
}
