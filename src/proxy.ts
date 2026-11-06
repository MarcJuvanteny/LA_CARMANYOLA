import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sessió de Supabase i protegeix el panell.
// També marca les peticions del panell perquè next-intl les serveixi sempre en català.
export async function proxy(request: NextRequest) {
  // Domini del backoffice (p. ex. carmanyola-panel.vercel.app): l'arrel porta directe al panell.
  if (request.nextUrl.pathname === "/") {
    const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0];
    if (esDominiPanell(host)) {
      const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
      return NextResponse.redirect(new URL("/panel", `${protocol}://${host}`));
    }
    return NextResponse.next();
  }

  // Es refà cada cop: si Supabase renova la sessió, les galetes noves també han d'arribar a la pàgina.
  const segueix = () => {
    const capcaleres = new Headers(request.headers);
    capcaleres.set("x-zona", "panel");
    return NextResponse.next({ request: { headers: capcaleres } });
  };
  let response = segueix();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (llista) => {
        llista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = segueix();
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

/** `PANEL_HOSTS` (separats per comes) mana; si no hi és, qualsevol domini que contingui "panel" o "backoffice". */
function esDominiPanell(host: string) {
  const llista = (process.env.PANEL_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  const h = host.toLowerCase();
  return llista.length ? llista.includes(h) : /panel|backoffice/.test(h);
}

export const config = {
  matcher: ["/", "/panel/:path*", "/entra"],
};
