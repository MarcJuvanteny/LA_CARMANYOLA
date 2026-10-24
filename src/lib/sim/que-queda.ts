/**
 * En tancar cada servei: el que queda de cada plat = producció − venut + una mica de soroll
 * (racions que es mengen a cuina, alguna que cau…). Es desa a leftovers.remaining.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { diaLocal, horaLocal, momentLocal } from "./calendar";
import { Rng } from "./rng";

const FINESTRES = [
  { service: "migdia", inici: "12:30", fi: "16:00", calculaDe: "16:00", calculaFins: "17:00" },
  { service: "vespre", inici: "19:30", fi: "22:30", calculaDe: "22:30", calculaFins: "23:30" },
] as const;

export async function calculaQueQueda(db: SupabaseClient, ara = new Date(), forca = false) {
  const dia = diaLocal(ara);
  const hora = horaLocal(ara);
  const fets: string[] = [];
  for (const f of FINESTRES) {
    // La ruta es crida cada 30 min (UTC): aquí decidim si és l'hora en Europe/Madrid.
    const toca = forca ? hora >= f.fi : hora >= f.calculaDe && hora < f.calculaFins;
    if (!toca) continue;

    const { data: files, error } = await db
      .from("leftovers")
      .select("dish_id, made, remaining")
      .eq("day", dia)
      .eq("service", f.service);
    if (error) throw new Error(error.message);
    const pendents = (files ?? []).filter((x) => forca || x.remaining == null);
    if (!pendents.length) continue;

    const { data: comandes, error: e2 } = await db
      .from("orders")
      .select("id")
      .eq("status", "confirmada")
      .gte("pickup_at", momentLocal(dia, f.inici).toISOString())
      .lt("pickup_at", momentLocal(dia, f.fi).toISOString());
    if (e2) throw new Error(e2.message);
    const ids = (comandes ?? []).map((c) => c.id);
    const venut = new Map<number, number>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data: items, error: e3 } = await db.from("order_items").select("dish_id, qty").in("order_id", ids.slice(i, i + 200));
      if (e3) throw new Error(e3.message);
      for (const it of items ?? []) venut.set(it.dish_id, (venut.get(it.dish_id) ?? 0) + it.qty);
    }

    for (const x of pendents) {
      const soroll = new Rng(`carmanyola:qq:${dia}:${f.service}:${x.dish_id}`).int(-1, 1);
      const queda = Math.max(0, x.made - (venut.get(x.dish_id) ?? 0) + soroll);
      const { error: e4 } = await db
        .from("leftovers")
        .update({ remaining: queda, computed_at: ara.toISOString() })
        .match({ day: dia, service: f.service, dish_id: x.dish_id });
      if (e4) throw new Error(e4.message);
    }
    fets.push(f.service);
  }
  return { dia, serveis: fets };
}
