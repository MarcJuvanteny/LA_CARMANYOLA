import "server-only";
import { randomBytes } from "node:crypto";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { serviceClient } from "@/lib/sim/db";
import { avisaWallet } from "@/lib/wallet/avisa";
import { normalitzaMobil } from "@/lib/web/mobil";
import { validaCistella, type DadesPlat, type LiniaEntrada, type LiniaValidada } from "./cistella";

export type { LiniaEntrada, LiniaValidada };

const ZONA = "Europe/Madrid";
export type Idioma = "ca" | "es" | "en";

/** Codi de la faixa: 12 caràcters url-safe (72 bits), impossible d'endevinar. */
export const nouCodiQr = () => randomBytes(9).toString("base64url");

async function carta(): Promise<DadesPlat[]> {
  const { data, error } = await serviceClient().from("dishes").select("id, slug, name, section, price_cents, available");
  if (error) throw new Error(error.message);
  return data as DadesPlat[];
}

/** Els preus els posa el servidor: el que arriba del navegador només diu què i quant. */
export async function preparaCistella(entrada: LiniaEntrada[]) {
  return validaCistella(entrada, await carta());
}

/** Crea la comanda pendent de pagament. Si el mòbil és d'un carnet, ja hi queda lligada. */
export async function creaComanda(d: { linies: LiniaEntrada[]; hora: string; nom: string; mobil?: string; locale: Idioma }) {
  const nom = d.nom.trim().slice(0, 60);
  if (!nom) throw new Error("Falta el nom");
  const cistella = await preparaCistella(d.linies);
  const db = serviceClient();

  const mobil = d.mobil ? normalitzaMobil(d.mobil) : null;
  const { data: client } = mobil ? await db.from("customers").select("id").eq("phone", mobil).eq("simulated", false).maybeSingle() : { data: null };

  const avui = formatInTimeZone(new Date(), ZONA, "yyyy-MM-dd");
  const { data: comanda, error } = await db
    .from("orders")
    .insert({
      status: "pendent",
      channel: "web",
      customer_id: client?.id ?? null,
      customer_name: nom,
      phone: mobil,
      locale: d.locale,
      pickup_at: /^\d{2}:\d{2}$/.test(d.hora) ? fromZonedTime(`${avui}T${d.hora}:00`, ZONA).toISOString() : null,
      total_cents: cistella.total,
      dinar: cistella.linies.some((l) => l.dinar),
      cart: cistella.linies,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (cistella.items.length) {
    const { error: e } = await db.from("order_items").insert(cistella.items.map((i) => ({ ...i, order_id: comanda.id })));
    if (e) throw new Error(e.message);
  }
  return { id: comanda.id as string, cistella };
}

export async function guardaSessio(id: string, sessio: string) {
  await serviceClient().from("orders").update({ stripe_session_id: sessio }).eq("id", id);
}

/**
 * Pagament confirmat (webhook o retorn de Stripe; o directament, en mode demo). Idempotent:
 * només la primera crida suma la paraula, apunta el retorn de campanya i avisa el wallet.
 */
export async function confirmaComanda(id: string, sessio?: string) {
  const db = serviceClient();
  const { data, error } = await db.rpc("confirma_comanda", { p_order_id: id, p_qr: nouCodiQr(), p_session: sessio ?? null });
  if (error) throw new Error(error.message);
  if (!data?.confirmada) return { nova: false };

  const { data: o } = await db.from("orders").select("customer_id").eq("id", id).single();
  if (o?.customer_id) await sumaSegell(id, o.customer_id);
  return { nova: true };
}

/** Suma la paraula, apunta si torna gràcies a una campanya (14 dies) i actualitza el wallet. */
export async function sumaSegell(comanda: string, client: string) {
  const db = serviceClient();
  const { data: segell, error } = await db.rpc("registra_segell", { p_order_id: comanda });
  if (error) throw new Error(error.message);

  // Atribució: la primera comanda dins dels 14 dies següents a cada campanya (també per al grup de control).
  const fa14 = new Date(Date.now() - 14 * 86_400_000).toISOString();
  await db.from("campaign_recipients").update({ return_order_id: comanda }).eq("customer_id", client).is("return_order_id", null).gte("sent_at", fa14);

  if (segell?.segell) await avisaWallet(client).catch((e) => console.error("[wallet]", e));
  return segell as { segell: boolean; paraula?: number; paraules?: number; carnet_complet?: boolean; motiu?: string };
}

export async function cancellaComanda(id: string) {
  await serviceClient().from("orders").update({ status: "cancel·lada", cancelled_at: new Date().toISOString() }).eq("id", id).eq("status", "pendent");
}

/** El que veu el client a /comanda/[id]. L'id és un uuid: qui el té és qui ha fet la comanda. */
export async function comandaPublica(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = serviceClient();
  const { data: o } = await db
    .from("orders")
    .select("id, status, number, customer_id, customer_name, phone, pickup_at, total_cents, cart, stripe_session_id, simulated")
    .eq("id", id)
    .maybeSingle();
  if (!o || o.simulated) return null;

  let carnet: { nom: string; de: string | null; a: string | null; paraules: number; complet: boolean } | null = null;
  if (o.customer_id) {
    const [{ data: s }, { data: c }] = await Promise.all([
      db.from("stamps").select("word_id, words(from_word, to_word)").eq("order_id", id).maybeSingle(),
      db.from("customers").select("first_name").eq("id", o.customer_id).single(),
    ]);
    if (s && c) {
      const w = (Array.isArray(s.words) ? s.words[0] : s.words) as { from_word: string | null; to_word: string | null } | null;
      carnet = { nom: c.first_name, de: w?.from_word ?? null, a: w?.to_word ?? null, paraules: s.word_id, complet: s.word_id === 8 };
    }
  }
  return {
    id: o.id as string,
    estat: o.status as "pendent" | "confirmada" | "cancel·lada",
    numero: o.number ? String(o.number).padStart(4, "0") : null,
    nom: (o.customer_name as string) ?? "",
    mobil: (o.phone as string | null) ?? null,
    hora: o.pickup_at ? formatInTimeZone(new Date(o.pickup_at), ZONA, "HH:mm") : "",
    data: o.pickup_at ? formatInTimeZone(new Date(o.pickup_at), ZONA, "dd/MM/yyyy") : "",
    total: o.total_cents as number,
    linies: (o.cart ?? []) as LiniaValidada[],
    sessio: (o.stripe_session_id as string | null) ?? null,
    teCarnet: !!o.customer_id,
    carnet,
  };
}

export type ComandaPublica = NonNullable<Awaited<ReturnType<typeof comandaPublica>>>;
