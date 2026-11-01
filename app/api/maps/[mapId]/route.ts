import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid, mapSupabaseError } from "@/lib/server/persistence-api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ mapId: string }> };

function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { mapId } = await context.params;
    if (!isUuid(mapId)) return problem(400, "INVALID_MAP_ID", "mapId harus berupa UUID yang valid.");

    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return problem(401, "UNAUTHENTICATED", "Silakan masuk sebelum mengakses map.");

    const { data: map, error: mapError } = await supabase
      .from("maps")
      .select("id, workspace_id, title, description, schema_version, revision, created_at, updated_at")
      .eq("id", mapId)
      .is("deleted_at", null)
      .maybeSingle();

    if (mapError) {
      const mapped = mapSupabaseError(mapError);
      return problem(mapped.status, mapped.code, mapped.message);
    }
    if (!map) return problem(404, "MAP_NOT_FOUND", "Map tidak ditemukan atau tidak dapat diakses.");

    const { data: revision, error: revisionError } = await supabase
      .from("map_revisions")
      .select("revision, snapshot, note, created_at")
      .eq("map_id", mapId)
      .eq("revision", map.revision)
      .maybeSingle();

    if (revisionError) {
      const mapped = mapSupabaseError(revisionError);
      return problem(mapped.status, mapped.code, mapped.message);
    }
    if (!revision) return problem(409, "REVISION_MISSING", "Map belum memiliki snapshot canonical.");

    return NextResponse.json({ data: { map, revision: revision.revision, document: revision.snapshot, note: revision.note } });
  } catch {
    return problem(503, "PERSISTENCE_UNAVAILABLE", "Layanan persistence belum dikonfigurasi atau tidak tersedia.");
  }
}
