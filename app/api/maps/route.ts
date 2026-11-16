import { requireAuthenticatedSupabase, graphDatabaseErrorResponse, graphProblemResponse } from "@/lib/server/graph-route";
import { isUuid, parseCanonicalGraph, parseCreateMapInput, parseGraphRpcResult, parseRequestId } from "@/lib/server/graph-api";
import { privateJson, readJsonBody } from "@/lib/server/private-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");
    if (!isUuid(workspaceId)) {
      return graphProblemResponse(422, "INVALID_WORKSPACE_ID", "workspaceId harus berupa UUID yang valid.");
    }

    const auth = await requireAuthenticatedSupabase();
    if (!auth.supabase) return auth.response;

    const { data, error } = await auth.supabase
      .from("maps")
      .select("id, workspace_id, title, description, revision, schema_version, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) return graphDatabaseErrorResponse(error);
    return privateJson({ data: data ?? [] });
  } catch {
    return graphProblemResponse(503, "PERSISTENCE_UNAVAILABLE", "Layanan mind map belum tersedia.");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedSupabase();
    if (!auth.supabase) return auth.response;

    const requestId = parseRequestId(request.headers.get("idempotency-key"));
    if (!requestId) {
      return graphProblemResponse(422, "INVALID_REQUEST_ID", "Header Idempotency-Key wajib diisi (maksimal 128 karakter).");
    }

    const body = await readJsonBody(request);
    if (!body.ok) return graphProblemResponse(body.status, body.code, body.message);

    const input = parseCreateMapInput(body.value);
    if (!input) {
      return graphProblemResponse(422, "INVALID_GRAPH", "Workspace atau dokumen canonical mind map tidak valid.");
    }

    const { data, error } = await auth.supabase.rpc("create_map", {
      p_workspace_id: input.workspaceId,
      p_title: input.title,
      p_initial_graph: input.graph,
      p_request_id: requestId,
    });
    if (error) return graphDatabaseErrorResponse(error);

    const result = parseGraphRpcResult(data);
    if (!result || result.revision !== 1) {
      return graphProblemResponse(502, "INVALID_PERSISTENCE_RESPONSE", "Database mengembalikan hasil pembuatan mind map yang tidak valid.");
    }
    return privateJson({ data: result }, { status: 201 });
  } catch {
    return graphProblemResponse(503, "PERSISTENCE_UNAVAILABLE", "Layanan mind map belum tersedia.");
  }
}
