import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidWriteResponse, isUuid, mapSupabaseError, parseCommitMapGraphInput, parseJsonBody } from "@/lib/server/persistence-api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ mapId: string }> };

function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { mapId } = await context.params;
    if (!isUuid(mapId)) return problem(400, "INVALID_MAP_ID", "mapId harus berupa UUID yang valid.");
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return problem(415, "UNSUPPORTED_MEDIA_TYPE", "Gunakan Content-Type application/json.");
    }

    const parsed = parseJsonBody(await request.text());
    if (!parsed.ok) return problem(parsed.problem.status, parsed.problem.code, parsed.problem.message);
    const input = parseCommitMapGraphInput(parsed.value);
    if (!input) return problem(422, "INVALID_GRAPH_INPUT", "Data commit atau dokumen canonical tidak valid.");

    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return problem(401, "UNAUTHENTICATED", "Silakan masuk sebelum menyimpan graph.");

    const { data, error } = await supabase.rpc("commit_map_graph", {
      p_map_id: mapId,
      p_expected_revision: input.expectedRevision,
      p_request_id: input.requestId,
      p_document: input.document,
      p_note: input.note,
    });
    if (error) {
      const mapped = mapSupabaseError(error);
      return problem(mapped.status, mapped.code, mapped.message);
    }
    if (!isValidWriteResponse(data, input.requestId) || data.mapId !== mapId) {
      return problem(502, "INVALID_PERSISTENCE_RESPONSE", "Server database mengembalikan respons yang tidak valid.");
    }
    return NextResponse.json({ data });
  } catch {
    return problem(503, "PERSISTENCE_UNAVAILABLE", "Layanan persistence belum dikonfigurasi atau tidak tersedia.");
  }
}
