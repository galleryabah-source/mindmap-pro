import { createClient } from "@/lib/supabase/server";
import { mapGraphDatabaseError } from "@/lib/server/graph-api";
import { privateJson } from "@/lib/server/private-json";

export async function requireAuthenticatedSupabase() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return {
      supabase: null,
      response: privateJson(
        { error: { code: "AUTH_REQUIRED", message: "Silakan masuk sebelum mengakses mind map." } },
        { status: 401 },
      ),
    };
  }
  return { supabase, response: null };
}

export function graphDatabaseErrorResponse(error: { code?: string; message?: string } | null | undefined) {
  const mapped = mapGraphDatabaseError(error);
  return privateJson(
    { error: { code: mapped.code, message: mapped.message } },
    { status: mapped.status },
  );
}

export function graphProblemResponse(status: number, code: string, message: string) {
  return privateJson({ error: { code, message } }, { status });
}
