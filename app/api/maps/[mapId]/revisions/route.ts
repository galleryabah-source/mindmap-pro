import { requireAuthenticatedSupabase, graphDatabaseErrorResponse, graphProblemResponse } from "@/lib/server/graph-route";
import { isUuid } from "@/lib/server/graph-api";
import { privateJson } from "@/lib/server/private-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ mapId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { mapId } = await context.params;
    if (!isUuid(mapId)) return graphProblemResponse(404, "MAP_NOT_FOUND", "Mind map tidak ditemukan atau tidak dapat diakses.");

    const url = new URL(request.url);
    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit === null ? 50 : Number(rawLimit);
    const rawBefore = url.searchParams.get("before");
    const before = rawBefore === null ? null : Number(rawBefore);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100
      || (before !== null && (!Number.isSafeInteger(before) || before < 1))) {
      return graphProblemResponse(422, "INVALID_PAGINATION", "limit harus 1–100 dan before harus berupa nomor revisi positif.");
    }

    const auth = await requireAuthenticatedSupabase();
    if (!auth.supabase) return auth.response;

    let query = auth.supabase
      .from("map_revisions")
      .select("revision, schema_version, created_at, created_by, note")
      .eq("map_id", mapId)
      .order("revision", { ascending: false })
      .limit(limit + 1);

    if (before !== null) query = query.lt("revision", before);

    const { data, error } = await query;
    if (error) return graphDatabaseErrorResponse(error);
    if (!data?.length) {
      return graphProblemResponse(404, "MAP_NOT_FOUND", "Mind map tidak ditemukan atau tidak memiliki riwayat revisi yang dapat diakses.");
    }

    const hasMore = data.length > limit;
    const page = hasMore ? data.slice(0, limit) : data;
    return privateJson({
      data: page,
      pagination: {
        limit,
        hasMore,
        nextBefore: hasMore ? page[page.length - 1]?.revision ?? null : null,
      },
    });
  } catch {
    return graphProblemResponse(503, "PERSISTENCE_UNAVAILABLE", "Riwayat mind map belum tersedia.");
  }
}
