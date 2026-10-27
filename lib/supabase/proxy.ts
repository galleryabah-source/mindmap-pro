import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  // Keep local-only editor usable before a dedicated Supabase project is configured.
  if (!url || !publishableKey) return NextResponse.next({ request });

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new NextResponse("Invalid Supabase configuration", { status: 500 });
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
    return new NextResponse("Supabase URL must use HTTPS", { status: 500 });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(parsedUrl.origin, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}
