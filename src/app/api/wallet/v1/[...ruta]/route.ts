import type { NextRequest } from "next/server";
import { comprovaSignatura } from "@/lib/signatura";
import { origen } from "@/lib/origen";
import { serviceClient } from "@/lib/sim/db";
import { appleConfigurat, passApple } from "@/lib/wallet/apple";
import { carnet } from "@/lib/wallet/carnet";

// Servei web de PassKit (Apple Wallet). L'iPhone hi registra la targeta i, quan rep un push,
// pregunta què ha canviat i descarrega el .pkpass nou.
// https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

/** "Authorization: ApplePass <token>": el token va lligat al número de sèrie (l'id del client). */
function autoritzat(req: NextRequest, serial: string) {
  const [esquema, token] = (req.headers.get("authorization") ?? "").split(" ");
  return esquema === "ApplePass" && !!token && UUID.test(serial) && comprovaSignatura("wallet-apple", serial, token, 40);
}

const tipusCorrecte = (t: string) => t === process.env.APPLE_PASS_TYPE_ID;

export async function GET(req: NextRequest, ctx: RouteContext<"/api/wallet/v1/[...ruta]">) {
  const ruta = (await ctx.params).ruta;
  if (!appleConfigurat()) return new Response(null, { status: 404 });

  // GET /v1/passes/{passTypeIdentifier}/{serialNumber}: la targeta al dia
  if (ruta[0] === "passes" && ruta.length === 3) {
    const [, tipus, serial] = ruta;
    if (!tipusCorrecte(tipus) || !autoritzat(req, serial)) return new Response(null, { status: 401 });
    const c = await carnet(serial);
    if (!c) return new Response(null, { status: 404 });
    const desDe = req.headers.get("if-modified-since");
    if (desDe && Math.floor(c.actualitzat.getTime() / 1000) <= Math.floor(new Date(desDe).getTime() / 1000)) {
      return new Response(null, { status: 304 });
    }
    return new Response(new Uint8Array(await passApple(c, await origen())), {
      headers: { "Content-Type": "application/vnd.apple.pkpass", "Last-Modified": c.actualitzat.toUTCString(), "Cache-Control": "no-store" },
    });
  }

  // GET /v1/devices/{device}/registrations/{passTypeIdentifier}?passesUpdatedSince=: què ha canviat
  if (ruta[0] === "devices" && ruta[2] === "registrations" && ruta.length === 4) {
    const [, device, , tipus] = ruta;
    if (!tipusCorrecte(tipus)) return new Response(null, { status: 404 });
    const db = serviceClient();
    const { data: regs } = await db.from("wallet_devices").select("customer_id").eq("device_id", device);
    const ids = (regs ?? []).map((r) => r.customer_id as string);
    if (!ids.length) return new Response(null, { status: 204 });
    const desDe = Number(req.nextUrl.searchParams.get("passesUpdatedSince") ?? 0);
    let q = db.from("customers").select("id, wallet_updated_at").in("id", ids);
    if (desDe > 0) q = q.gt("wallet_updated_at", new Date(desDe).toISOString());
    const { data } = await q;
    if (!data?.length) return new Response(null, { status: 204 });
    const ultim = Math.max(...data.map((d) => new Date(d.wallet_updated_at).getTime()));
    return Response.json({ serialNumbers: data.map((d) => d.id), lastUpdated: String(ultim) });
  }
  return new Response(null, { status: 404 });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/wallet/v1/[...ruta]">) {
  const ruta = (await ctx.params).ruta;

  // POST /v1/log: errors que l'iPhone ens explica
  if (ruta[0] === "log") {
    const { logs } = await req.json().catch(() => ({ logs: [] }));
    console.warn("[wallet] Apple:", logs);
    return new Response(null, { status: 200 });
  }

  // POST /v1/devices/{device}/registrations/{passTypeIdentifier}/{serial}
  if (ruta[0] === "devices" && ruta[2] === "registrations" && ruta.length === 5) {
    const [, device, , tipus, serial] = ruta;
    if (!tipusCorrecte(tipus) || !autoritzat(req, serial)) return new Response(null, { status: 401 });
    const { pushToken } = await req.json().catch(() => ({}));
    if (typeof pushToken !== "string" || !pushToken) return new Response(null, { status: 400 });
    const db = serviceClient();
    const { data: ja } = await db.from("wallet_devices").select("device_id").match({ device_id: device, customer_id: serial }).maybeSingle();
    const { error } = await db.from("wallet_devices").upsert({ device_id: device, customer_id: serial, push_token: pushToken });
    if (error) return new Response(null, { status: 500 });
    await db.from("customers").update({ wallet_apple_id: device }).eq("id", serial);
    return new Response(null, { status: ja ? 200 : 201 });
  }
  return new Response(null, { status: 404 });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/wallet/v1/[...ruta]">) {
  const ruta = (await ctx.params).ruta;
  if (ruta[0] === "devices" && ruta[2] === "registrations" && ruta.length === 5) {
    const [, device, , tipus, serial] = ruta;
    if (!tipusCorrecte(tipus) || !autoritzat(req, serial)) return new Response(null, { status: 401 });
    await serviceClient().from("wallet_devices").delete().match({ device_id: device, customer_id: serial });
    return new Response(null, { status: 200 });
  }
  return new Response(null, { status: 404 });
}
