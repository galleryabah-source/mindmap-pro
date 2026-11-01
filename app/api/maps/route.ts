import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid, mapSupabaseError, parseCreateMapInput, parseJsonBody } from "@/lib/server/persistence-api";

export const runtime = "nodejs";

function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase: null, response: problem(401, "UNAUTHENTICATED", "Silakan masuk sebelum mengakses map.") };
  return { supabase, response: null };
}

export async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");
    if (!isUuid(workspaceId)) return problem(400, "INVALID_WORKSPACE_ID", "workspaceId harus berupa UUID yang valid.");

    const auth = await authenticatedClient();
    if (!auth.supabase) return auth.response;

    const { data, error } = await auth.supabase
      .from("maps")
      .select("id, workspace_id, title, description, schema_version, revision, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      const mapped = mapSupabaseError(error);
      return problem(mapped.status, mapped.code, mapped.message);
    }
    return NextResponse.json({ data: data ?? [] });
  } catch {
    return problem(503, "PERSISTENCE_UNAVAILABLE", "Layanan persistence belum dikonfigurasi atau tidak tersedia.");
  }
}

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return problem(415, "UNSUPPORTED_MEDIA_TYPE", "Gunakan Content-Type application/json.");
    }
    const parsed = parseJsonBody(await request.text());
    if (!parsed.ok) return problem(parsed.problem.status, parsed.problem.code, parsed.problem.message);
    const input = parseCreateMapInput(parsed.value);
    if (!input) return problem(422, "INVALID_MAP_INPUT", "Data pembuatan map atau dokumen canonical tidak valid.");

    const auth = await authenticatedClient();
    if (!auth.supabase) return auth.response;

    const { data, error } = await auth.supabase.rpc("create_map_with_graph", {
      p_workspace_id: input.workspaceId,
      p_request_id: input.requestId,
      p_document: input.document,
      p_description: input.description,
    });
    if (error) {
      const mapped = mapSupabaseError(error);
      return problem(mapped.status, mapped.code, mapped.message);
    }
    if (!data || typeof data !== "object" || (data as { requestId?: unknown }).requestId !== input.requestId) {
      return problem(502, "INVALID_PERSISTENCE_RESPONSE", "Server database mengembalikan respons yang tidak valid.");
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return problem(503, "PERSISTENCE_UNAVAILABLE", "Layanan persistence belum dikonfigurasi atau tidak tersedia.");
  }
}
