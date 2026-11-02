import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isWorkspaceId,
  mapWorkspaceDatabaseError,
  parseCreateWorkspaceInput,
} from "@/lib/server/workspace-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_WORKSPACE_REQUEST_BYTES = 16 * 1024;

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Vary", "Cookie, Authorization");
  return response;
}

function problem(status: number, code: string, message: string) {
  return privateJson({ error: { code, message } }, { status });
}

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      supabase: null,
      response: problem(401, "UNAUTHENTICATED", "Silakan masuk sebelum mengakses workspace."),
    };
  }

  return { supabase, response: null };
}

async function readLimitedJson(request: Request): Promise<
  { ok: true; value: unknown } | { ok: false; status: number; code: string; message: string }
> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WORKSPACE_REQUEST_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "Ukuran permintaan melebihi batas 16 KB.",
    };
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
      if (totalBytes > MAX_WORKSPACE_REQUEST_BYTES) {
        await reader.cancel();
        return {
          ok: false,
          status: 413,
          code: "PAYLOAD_TOO_LARGE",
          message: "Ukuran permintaan melebihi batas 16 KB.",
        };
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
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false, status: 400, code: "INVALID_JSON", message: "Body permintaan bukan JSON yang valid." };
  }
}

export async function GET() {
  try {
    const auth = await getAuthenticatedClient();
    if (!auth.supabase) return auth.response;

    const { data, error } = await auth.supabase
      .from("workspaces")
      .select("id, name, slug, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (error) {
      const mapped = mapWorkspaceDatabaseError(error);
      return problem(mapped.status, mapped.code, mapped.message);
    }

    return privateJson({ data: data ?? [] });
  } catch {
    return problem(503, "PERSISTENCE_UNAVAILABLE", "Layanan workspace belum tersedia.");
  }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
      return problem(415, "UNSUPPORTED_MEDIA_TYPE", "Gunakan Content-Type application/json.");
    }

    const auth = await getAuthenticatedClient();
    if (!auth.supabase) return auth.response;

    const parsed = await readLimitedJson(request);
    if (!parsed.ok) return problem(parsed.status, parsed.code, parsed.message);

    const input = parseCreateWorkspaceInput(parsed.value);
    if (!input) {
      return problem(422, "INVALID_WORKSPACE_INPUT", "Nama atau slug workspace tidak valid.");
    }

    const { data, error } = await auth.supabase.rpc("create_workspace", {
      p_name: input.name,
      p_slug: input.slug,
    });

    if (error) {
      const mapped = mapWorkspaceDatabaseError(error);
      return problem(mapped.status, mapped.code, mapped.message);
    }

    if (!isWorkspaceId(data)) {
      return problem(502, "INVALID_PERSISTENCE_RESPONSE", "Database mengembalikan ID workspace yang tidak valid.");
    }

    return privateJson({ data: { id: data, ...input } }, { status: 201 });
  } catch {
    return problem(503, "PERSISTENCE_UNAVAILABLE", "Layanan workspace belum tersedia.");
  }
}
