import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isWorkspaceId,
  mapWorkspaceDatabaseError,
  parseCreateWorkspaceInput,
} from "@/lib/server/workspace-api";

export const runtime = "nodejs";

function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
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

    return NextResponse.json({ data: data ?? [] });
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

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 16 * 1024) {
      return problem(413, "PAYLOAD_TOO_LARGE", "Ukuran permintaan melebihi batas 16 KB.");
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      return problem(400, "INVALID_JSON", "Body permintaan bukan JSON yang valid.");
    }

    const input = parseCreateWorkspaceInput(body);
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

    return NextResponse.json({ data: { id: data, ...input } }, { status: 201 });
  } catch {
    return problem(503, "PERSISTENCE_UNAVAILABLE", "Layanan workspace belum tersedia.");
  }
}
