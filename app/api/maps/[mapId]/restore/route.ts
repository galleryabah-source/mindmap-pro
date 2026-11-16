import { requireAuthenticatedSupabase, graphDatabaseErrorResponse, graphProblemResponse, requireSameOriginMutation } from "@/lib/server/graph-route";
import { isUuid, parseGraphRpcResult, parseRequestId, parseRestoreMapInput } from "@/lib/server/graph-api";
import { privateJson, readJsonBody } from "@/lib/server/private-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ mapId: string }> };

export async function POST(request: Request, context: RouteContext) {
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

    const input = parseRestoreMapInput(body.value);
    if (!input) {
      return graphProblemResponse(422, "INVALID_RESTORE_INPUT", "sourceRevision dan expectedRevision harus berupa bilangan bulat positif.");
    }

    const { data, error } = await auth.supabase.rpc("restore_map_revision", {
      p_map_id: mapId,
      p_source_revision: input.sourceRevision,
      p_expected_revision: input.expectedRevision,
      p_request_id: requestId,
    });
    if (error) return graphDatabaseErrorResponse(error);

    const result = parseGraphRpcResult(data, mapId);
    if (!result || result.revision !== input.expectedRevision + 1) {
      return graphProblemResponse(502, "INVALID_PERSISTENCE_RESPONSE", "Database mengembalikan hasil pemulihan revisi yang tidak valid.");
    }
    return privateJson({ data: { ...result, sourceRevision: input.sourceRevision } });
  } catch {
    return graphProblemResponse(503, "PERSISTENCE_UNAVAILABLE", "Layanan mind map belum tersedia.");
  }
}
