import { assertCanonicalGraph, type CanonicalGraph } from "@/lib/domain/graph-commands";

export const MAX_PERSISTENCE_BODY_BYTES = 10 * 1024 * 1024;

export type ApiProblem = {
  status: number;
  code: string;
  message: string;
};

export type PersistedDocument = {
  format: "mindmap-pro";
  version: 2;
  graph: CanonicalGraph;
};

export type CreateMapInput = {
  workspaceId: string;
  requestId: string;
  document: PersistedDocument;
  description: string;
};

export type CommitMapGraphInput = {
  expectedRevision: number;
  requestId: string;
  document: PersistedDocument;
  note: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJsonContentType(value: string | null): boolean {
  return value?.split(";")[0]?.trim().toLowerCase() === "application/json";
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseJsonBody(raw: string): { ok: true; value: unknown } | { ok: false; problem: ApiProblem } {
  if (new TextEncoder().encode(raw).byteLength > MAX_PERSISTENCE_BODY_BYTES) {
    return { ok: false, problem: { status: 413, code: "PAYLOAD_TOO_LARGE", message: "Ukuran permintaan melebihi batas 10 MB." } };
  }
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, problem: { status: 400, code: "INVALID_JSON", message: "Body permintaan bukan JSON yang valid." } };
  }
}

export async function readJsonRequest(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; problem: ApiProblem }> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PERSISTENCE_BODY_BYTES) {
    return { ok: false, problem: { status: 413, code: "PAYLOAD_TOO_LARGE", message: "Ukuran permintaan melebihi batas 10 MB." } };
  }

  if (!request.body) return parseJsonBody("");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_PERSISTENCE_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, problem: { status: 413, code: "PAYLOAD_TOO_LARGE", message: "Ukuran permintaan melebihi batas 10 MB." } };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return parseJsonBody(new TextDecoder().decode(bytes));
}

export function parsePersistedDocument(value: unknown): PersistedDocument | null {
  if (!isRecord(value) || value.format !== "mindmap-pro" || value.version !== 2 || !isRecord(value.graph)) {
    return null;
  }
  try {
    const graph = assertCanonicalGraph(value.graph as unknown as CanonicalGraph);
    return { format: "mindmap-pro", version: 2, graph };
  } catch {
    return null;
  }
}

export function parseCreateMapInput(value: unknown): CreateMapInput | null {
  if (!isRecord(value)
    || !isUuid(value.workspaceId)
    || !isUuid(value.requestId)
    || (value.description !== undefined && (typeof value.description !== "string" || value.description.length > 10000))) {
    return null;
  }
  const document = parsePersistedDocument(value.document);
  if (!document) return null;
  return {
    workspaceId: value.workspaceId,
    requestId: value.requestId,
    document,
    description: typeof value.description === "string" ? value.description : "",
  };
}

export function parseCommitMapGraphInput(value: unknown): CommitMapGraphInput | null {
  if (!isRecord(value)
    || !Number.isSafeInteger(value.expectedRevision)
    || (value.expectedRevision as number) < 1
    || !isUuid(value.requestId)
    || (value.note !== undefined && (typeof value.note !== "string" || value.note.length > 1000))) {
    return null;
  }
  const document = parsePersistedDocument(value.document);
  if (!document) return null;
  return {
    expectedRevision: value.expectedRevision as number,
    requestId: value.requestId,
    document,
    note: typeof value.note === "string" ? value.note : "",
  };
}

export function mapSupabaseError(error: { code?: string; message?: string } | null | undefined): ApiProblem {
  switch (error?.code) {
    case "42501":
      return { status: 403, code: "FORBIDDEN", message: "Akun tidak memiliki izin untuk melakukan operasi ini." };
    case "23505":
      return { status: 409, code: "IDEMPOTENCY_CONFLICT", message: "Request ID telah digunakan dengan payload yang berbeda." };
    case "40001":
      return { status: 409, code: "REVISION_CONFLICT", message: "Dokumen telah berubah. Muat versi terbaru sebelum menyimpan kembali." };
    case "22023":
    case "23514":
      return { status: 422, code: "INVALID_GRAPH", message: "Dokumen graph tidak memenuhi kontrak canonical." };
    case "PGRST116":
      return { status: 404, code: "NOT_FOUND", message: "Data yang diminta tidak ditemukan." };
    default:
      return { status: 500, code: "PERSISTENCE_ERROR", message: "Operasi penyimpanan tidak dapat diselesaikan." };
  }
}

export function isValidWriteResponse(
  value: unknown,
  requestId: string,
): value is { mapId: string; revision: number; snapshotId: string; requestId: string } {
  return isRecord(value)
    && isUuid(value.mapId)
    && Number.isSafeInteger(value.revision)
    && (value.revision as number) >= 1
    && isUuid(value.snapshotId)
    && value.requestId === requestId;
}
