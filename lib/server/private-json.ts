import { NextResponse } from "next/server";

export function privateJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Vary", "Cookie, Authorization");
  return NextResponse.json(body, { ...init, headers });
}

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: number; code: string; message: string };

export async function readJsonBody(request: Request, maxBytes = 8_000_000): Promise<JsonBodyResult> {
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return { ok: false, status: 415, code: "UNSUPPORTED_MEDIA_TYPE", message: "Gunakan Content-Type application/json." };
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, status: 413, code: "PAYLOAD_TOO_LARGE", message: "Ukuran dokumen mind map melebihi batas 8 MB." };
  }
  if (!request.body) {
    return { ok: false, status: 400, code: "INVALID_JSON", message: "Body permintaan bukan JSON yang valid." };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413, code: "PAYLOAD_TOO_LARGE", message: "Ukuran dokumen mind map melebihi batas 8 MB." };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, code: "INVALID_JSON", message: "Body permintaan tidak dapat dibaca." };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown };
  } catch {
    return { ok: false, status: 400, code: "INVALID_JSON", message: "Body permintaan bukan JSON UTF-8 yang valid." };
  }
}
