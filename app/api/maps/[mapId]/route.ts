import { requireAuthenticatedSupabase, graphDatabaseErrorResponse, graphProblemResponse, requireSameOriginMutation } from "@/lib/server/graph-route";
import { isUuid, parseGraphRpcResult, parseRequestId, parseSaveMapInput, parseCanonicalGraph } from "@/lib/server/graph-api";
import { privateJson, readJsonBody } from "@/lib/server/private-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ mapId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { mapId } = await context.params;
    if (!isUuid(mapId)) return graphProblemResponse(404, "MAP_NOT_FOUND", "Mind map tidak ditemukan atau tidak dapat diakses.");

    const auth = await requireAuthenticatedSupabase();
    if (!auth.supabase) return auth.response;

    const { data: map, error: mapError } = await auth.supabase
      .from("maps")
      .select("id, workspace_id, title, description, revision, schema_version, created_at, updated_at")
      .eq("id", mapId)
      .is("deleted_at", null)
      .maybeSingle();

    if (mapError) return graphDatabaseErrorResponse(mapError);
    if (!map) return graphProblemResponse(404, "MAP_NOT_FOUND", "Mind map tidak ditemukan atau tidak dapat diakses.");

    const { data: revision, error: revisionError } = await auth.supabase
      .from("map_revisions")
      .select("revision, schema_version, snapshot, created_at")
      .eq("map_id", mapId)
      .eq("revision", map.revision)
      .maybeSingle();

    if (revisionError) return graphDatabaseErrorResponse(revisionError);
    const graph = parseCanonicalGraph(revision?.snapshot);
    if (!revision || !graph || revision.revision !== map.revision) {
      return graphProblemResponse(503, "SNAPSHOT_UNAVAILABLE", "Snapshot canonical mind map tidak tersedia atau tidak konsisten.");
    }

    return privateJson({
      data: {
        id: map.id,
        workspaceId: map.workspace_id,
        title: map.title,
        description: map.description,
        revision: map.revision,
        schemaVersion: map.schema_version,
        createdAt: map.created_at,
        updatedAt: map.updated_at,
        graph,
      },
    });
  } catch {
    return graphProblemResponse(503, "PERSISTENCE_UNAVAILABLE", "Layanan mind map belum tersedia.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const originProblem = requireSameOriginMutation(request);
    if (originProblem) return originProblem;
    const { mapId } = await context.params;
    if (!isUuid(mapId)) return graphProblemResponse(404, "MAP_NOT_FOUND", "Mind map tidak ditemukan atau tidak dapat diakses.");

    const auth = await requireAuthenticatedSupabase();
    if (!auth.supabase) return auth.response;

    const requestId = parseRequestId(request.headers.get("idempotency-key"));
    if (!requestId) {
      return graphProblemResponse(422, "INVALID_REQUEST_ID", "Header Idempotency-Key wajib diisi (maksimal 128 karakter).");
    }

    const body = await readJsonBody(request);
    if (!body.ok) return graphProblemResponse(body.status, body.code, body.message);

    const input = parseSaveMapInput(body.value);
    if (!input) {
      return graphProblemResponse(422, "INVALID_GRAPH", "expectedRevision atau dokumen canonical mind map tidak valid.");
    }

    const { data, error } = await auth.supabase.rpc("save_map_snapshot", {
      p_map_id: mapId,
      p_expected_revision: input.expectedRevision,
      p_graph: input.graph,
      p_note: input.note,
      p_request_id: requestId,
    });
    if (error) return graphDatabaseErrorResponse(error);

    const result = parseGraphRpcResult(data, mapId);
    if (!result || result.revision !== input.expectedRevision + 1) {
      return graphProblemResponse(502, "INVALID_PERSISTENCE_RESPONSE", "Database mengembalikan hasil penyimpanan revisi yang tidak valid.");
    }
    return privateJson({ data: result });
  } catch {
    return graphProblemResponse(503, "PERSISTENCE_UNAVAILABLE", "Layanan mind map belum tersedia.");
  }
}
