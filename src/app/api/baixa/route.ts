import type { NextRequest } from "next/server";
import { donaDeBaixa } from "@/lib/enviaments/enviaments";
import { comprovaSignatura } from "@/lib/signatura";

// Baixa amb un clic des del client de correu (RFC 8058: List-Unsubscribe-Post). Gmail i Apple Mail fan POST aquí.
export async function POST(req: NextRequest) {
  const c = req.nextUrl.searchParams.get("c") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!comprovaSignatura("baixa", c, t)) return new Response(null, { status: 400 });
  await donaDeBaixa(c);
  return new Response(null, { status: 200 });
}

// Si algú obre l'enllaç al navegador, a la pàgina amb el botó.
export function GET(req: NextRequest) {
  const c = req.nextUrl.searchParams.get("c") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  return Response.redirect(new URL(`/baixa/${encodeURIComponent(c)}/${encodeURIComponent(t)}`, req.url), 303);
}
