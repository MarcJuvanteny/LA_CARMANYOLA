import "server-only";
import { serviceClient } from "@/lib/sim/db";
import { normalitzaMobil } from "@/lib/web/mobil";
import { sumaSegell } from "./comandes";

// La faixa "Desbowlitza aquí": un QR únic per comanda que porta a /c/[codi] i hi suma la paraula.
// D'un sol ús: un cop la comanda té segell, el codi ja no suma res més.

const CODI = /^[A-Za-z0-9_-]{8,32}$/;

export interface ParaulaFaixa {
  nom: string;
  de: string | null;
  a: string | null;
  paraules: number;
  complet: boolean;
}

export type EstatFaixa =
  | { estat: "no-trobada" }
  | { estat: "plataforma" }
  | { estat: "ja-sumada"; paraula: ParaulaFaixa | null }
  | { estat: "per-sumar" };

async function paraulaDe(comanda: string): Promise<ParaulaFaixa | null> {
  const { data: s } = await serviceClient().from("stamps").select("word_id, customers(first_name), words(from_word, to_word)").eq("order_id", comanda).maybeSingle();
  if (!s) return null;
  const w = (Array.isArray(s.words) ? s.words[0] : s.words) as { from_word: string | null; to_word: string | null } | null;
  const c = (Array.isArray(s.customers) ? s.customers[0] : s.customers) as { first_name: string } | null;
  return { nom: c?.first_name ?? "", de: w?.from_word ?? null, a: w?.to_word ?? null, paraules: s.word_id, complet: s.word_id === 8 };
}

async function comandaDeCodi(codi: string) {
  if (!CODI.test(codi)) return null;
  const { data } = await serviceClient().from("orders").select("id, channel, customer_id, qr_used_at").eq("qr_code", codi).eq("status", "confirmada").maybeSingle();
  return data;
}

export async function estatFaixa(codi: string): Promise<EstatFaixa> {
  const o = await comandaDeCodi(codi);
  if (!o) return { estat: "no-trobada" };
  if (o.channel === "plataforma") return { estat: "plataforma" };
  const paraula = await paraulaDe(o.id);
  if (paraula || o.qr_used_at) return { estat: "ja-sumada", paraula };
  return { estat: "per-sumar" };
}

export type ResultatFaixa = EstatFaixa | { estat: "sense-carnet" } | { estat: "sumada"; paraula: ParaulaFaixa };

export async function sumaFaixa(codi: string, mobilBrut: string): Promise<ResultatFaixa> {
  const estat = await estatFaixa(codi);
  if (estat.estat !== "per-sumar") return estat;
  const mobil = normalitzaMobil(mobilBrut);
  if (!mobil) return { estat: "sense-carnet" };

  const db = serviceClient();
  const { data: client } = await db.from("customers").select("id").eq("phone", mobil).eq("simulated", false).maybeSingle();
  if (!client) return { estat: "sense-carnet" };

  const o = (await comandaDeCodi(codi))!;
  // La comanda és de qui escaneja la faixa (pot ser que la pagués algú altre).
  await db.from("orders").update({ customer_id: client.id }).eq("id", o.id);
  const segell = await sumaSegell(o.id, client.id);
  const paraula = await paraulaDe(o.id);
  if (!segell.segell || !paraula) return { estat: "ja-sumada", paraula };
  return { estat: "sumada", paraula };
}
