import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sessió de Supabase i protegeix el panell.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (llista) => {
        llista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        llista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/panel")) {
    // Darrere d'un proxy (Codespaces, Vercel) el navegador ha de tornar al mateix domini, no a localhost.
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
    const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
    const torna = encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(new URL(`/entra?torna=${torna}`, `${protocol}://${host}`));
  }
  return response;
}

export const config = {
  matcher: ["/panel/:path*", "/entra"],
};
