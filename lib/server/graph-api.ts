import {
  assertCanonicalGraph,
  type CanonicalGraph,
} from "@/lib/domain/graph-commands";

export type GraphApiProblem = {
  status: number;
  code: string;
  message: string;
};

export type CreateMapInput = {
  workspaceId: string;
  title: string | null;
  graph: CanonicalGraph;
};

export type SaveMapInput = {
  expectedRevision: number;
  graph: CanonicalGraph;
  note: string;
};

export type RestoreMapInput = {
  sourceRevision: number;
  expectedRevision: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseRequestId(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const requestId = value.trim();
  if (!requestId || requestId.length > 128 || /[\u0000-\u001f\u007f]/.test(requestId)) return null;
  return requestId;
}

export function parseCanonicalGraph(value: unknown): CanonicalGraph | null {
  if (!isRecord(value)) return null;
  try {
    return assertCanonicalGraph(value as unknown as CanonicalGraph);
  } catch {
    return null;
  }
}

export function parseCreateMapInput(value: unknown): CreateMapInput | null {
  if (!isRecord(value) || !isUuid(value.workspaceId)) return null;
  const graph = parseCanonicalGraph(value.graph);
  if (!graph) return null;
  let title: string | null = null;
  if (value.title !== undefined && value.title !== null) {
    if (typeof value.title !== "string") return null;
    title = value.title.trim();
    if (!title || title.length > 240) return null;
  }
  return { workspaceId: value.workspaceId, title, graph };
}

export function parseSaveMapInput(value: unknown): SaveMapInput | null {
  if (!isRecord(value) || !Number.isSafeInteger(value.expectedRevision)
    || (value.expectedRevision as number) < 1) return null;
  const graph = parseCanonicalGraph(value.graph);
  if (!graph) return null;
  let note = "";
  if (value.note !== undefined && value.note !== null) {
    if (typeof value.note !== "string" || value.note.length > 1000) return null;
    note = value.note;
  }
  return { expectedRevision: value.expectedRevision as number, graph, note };
}

export function parseRestoreMapInput(value: unknown): RestoreMapInput | null {
  if (!isRecord(value)
    || !Number.isSafeInteger(value.sourceRevision)
    || !Number.isSafeInteger(value.expectedRevision)
    || (value.sourceRevision as number) < 1
    || (value.expectedRevision as number) < 1) return null;
  return {
    sourceRevision: value.sourceRevision as number,
    expectedRevision: value.expectedRevision as number,
  };
}

export function mapGraphDatabaseError(
  error: { code?: string; message?: string } | null | undefined,
): GraphApiProblem {
  const message = error?.message ?? "";
  if (message.startsWith("AUTH_REQUIRED")) {
    return { status: 401, code: "AUTH_REQUIRED", message: "Silakan masuk sebelum mengubah mind map." };
  }
  if (message.startsWith("FORBIDDEN") || error?.code === "42501") {
    return { status: 403, code: "FORBIDDEN", message: "Akun tidak memiliki izin untuk mengubah mind map ini." };
  }
  if (message.startsWith("MAP_NOT_FOUND") || error?.code === "P0002") {
    return { status: 404, code: "MAP_NOT_FOUND", message: "Mind map tidak ditemukan atau tidak dapat diakses." };
  }
  if (message.startsWith("REVISION_CONFLICT") || error?.code === "40001") {
    return { status: 409, code: "REVISION_CONFLICT", message: "Mind map telah berubah. Draft lokal tetap dipertahankan; muat ulang atau bandingkan revisi." };
  }
  if (message.startsWith("REQUEST_ID_REUSED")) {
    return { status: 409, code: "REQUEST_ID_REUSED", message: "ID permintaan sudah digunakan untuk perubahan yang berbeda." };
  }
  if (message.startsWith("INVALID_REQUEST_ID")) {
    return { status: 422, code: "INVALID_REQUEST_ID", message: "Idempotency-Key tidak valid." };
  }
  if (error?.code === "22023" || error?.code === "23514" || error?.code === "23503") {
    return { status: 422, code: "INVALID_GRAPH", message: "Struktur mind map tidak memenuhi kontrak graph." };
  }
  return { status: 500, code: "PERSISTENCE_ERROR", message: "Perubahan mind map tidak dapat disimpan." };
}

export function parseGraphRpcResult(value: unknown, expectedMapId?: string): {
  mapId: string;
  revision: number;
  schemaVersion: number;
  graph: CanonicalGraph;
} | null {
  if (!isRecord(value) || !isUuid(value.map_id)
    || (expectedMapId !== undefined && value.map_id !== expectedMapId)
    || !Number.isSafeInteger(value.revision) || (value.revision as number) < 1
    || !Number.isSafeInteger(value.schema_version) || (value.schema_version as number) < 1) return null;
  const graph = parseCanonicalGraph(value.graph);
  if (!graph) return null;
  return {
    mapId: value.map_id,
    revision: value.revision as number,
    schemaVersion: value.schema_version as number,
    graph,
  };
}
