"use server";

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { serviceClient } from "@/lib/sim/db";
import type { Linia, ParaulaSumada } from "@/components/web/Cistella";
import { normalitzaMobil } from "@/lib/web/mobil";

// Suma la paraula de la comanda al carnet que el client ja té, a partir del mòbil.
// La comanda es desa a Supabase perquè el segell va lligat a una comanda (màxim un per comanda).

const ZONA = "Europe/Madrid";

export async function sumaParaula(dades: { mobil: string; linies: Linia[]; total: number; hora: string }): Promise<ParaulaSumada> {
  const mobil = normalitzaMobil(dades.mobil);
  if (!mobil) return { trobat: false, mobil: dades.mobil };
  const db = serviceClient();

  const { data: client } = await db.from("customers").select("id, first_name").eq("phone", mobil).eq("simulated", false).limit(1).maybeSingle();
  if (!client) return { trobat: false, mobil: dades.mobil };

  const avui = formatInTimeZone(new Date(), ZONA, "yyyy-MM-dd");
  const { data: comanda, error } = await db
    .from("orders")
    .insert({
      customer_id: client.id,
      channel: "web",
      pickup_at: /^\d{2}:\d{2}$/.test(dades.hora) ? fromZonedTime(`${avui}T${dades.hora}:00`, ZONA).toISOString() : null,
      total_cents: Math.round(dades.total),
      dinar: dades.linies.some((l) => l.dinar),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { data: plats } = await db
    .from("dishes")
    .select("id, slug")
    .in(
      "slug",
      dades.linies.map((l) => l.slug),
    );
  const idDe = new Map((plats ?? []).map((p) => [p.slug, p.id]));
  const items = dades.linies.filter((l) => idDe.has(l.slug)).map((l) => ({ order_id: comanda.id, dish_id: idDe.get(l.slug), qty: l.quantitat, unit_price_cents: Math.round(l.preu) }));
  if (items.length) await db.from("order_items").insert(items);

  const { data: segell, error: e } = await db.rpc("registra_segell", { p_order_id: comanda.id });
  if (e) throw new Error(e.message);
  const { data: paraula } = await db.from("words").select("from_word, to_word").eq("id", segell.paraula).single();

  return { trobat: true, nom: client.first_name, de: paraula?.from_word ?? null, a: paraula?.to_word ?? null, paraules: segell.paraules, complet: segell.carnet_complet };
}
