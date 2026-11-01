import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isJsonContentType, mapSupabaseError, parseCreateWorkspaceInput, readJsonRequest } from "@/lib/server/persistence-api";

export const runtime = "nodejs";

function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { supabase: null, response: problem(401, "UNAUTHENTICATED", "Silakan masuk sebelum mengakses workspace.") };
  }
  return { supabase, response: null };
}

export async function GET() {
  try {
    const auth = await authenticatedClient();
    if (!auth.supabase) return auth.response;

    const { data, error } = await auth.supabase
      .from("workspaces")
      .select("id, name, slug, created_at, updated_at")
      .order("created_at", { ascending: true });

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
    if (!isJsonContentType(request.headers.get("content-type"))) {
      return problem(415, "UNSUPPORTED_MEDIA_TYPE", "Gunakan Content-Type application/json.");
    }

    const parsed = await readJsonRequest(request);
    if (!parsed.ok) return problem(parsed.problem.status, parsed.problem.code, parsed.problem.message);
    const input = parseCreateWorkspaceInput(parsed.value);
    if (!input) return problem(422, "INVALID_WORKSPACE_INPUT", "Nama atau slug workspace tidak valid.");

    const auth = await authenticatedClient();
    if (!auth.supabase) return auth.response;

    const { data, error } = await auth.supabase.rpc("create_workspace", {
      p_name: input.name,
      p_slug: input.slug,
    });
    if (error) {
      if (error.code === "23505") {
        return problem(409, "WORKSPACE_SLUG_TAKEN", "Slug workspace sudah digunakan.");
      }
      const mapped = mapSupabaseError(error);
      return problem(mapped.status, mapped.code, mapped.message);
    }
    if (typeof data !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data)) {
      return problem(502, "INVALID_PERSISTENCE_RESPONSE", "Server database mengembalikan ID workspace yang tidak valid.");
    }

    return NextResponse.json({ data: { id: data, ...input } }, { status: 201 });
  } catch {
    return problem(503, "PERSISTENCE_UNAVAILABLE", "Layanan persistence belum dikonfigurasi atau tidak tersedia.");
  }
}
