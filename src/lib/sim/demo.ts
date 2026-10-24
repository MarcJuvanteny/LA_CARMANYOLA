/**
 * Reinicia el que hagi canviat el compte de demo (l'amo) sense tocar l'històric:
 * propostes en esborrany, peticions de campanya, carta, veu de marca, padró, Què Queda i producció.
 * Els valors de referència són els de les dades base (src/lib/data).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { campanyes } from "@/lib/data/campanyes";
import { plats } from "@/lib/data/carta";
import { veuInicial } from "@/lib/data/veu";

async function ok(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p;
  if (error) throw new Error(error.message);
}

export async function resetDemo(db: SupabaseClient) {
  const missatges = (id: string) => campanyes.find((c) => c.id === id)!.missatges;
  const esborranys: [string, string][] = [
    ["recupera-habituals", "recupera-23"],
    ["segell-doble", "segell-doble"],
    ["carxofa", "carxofa"],
  ];
  for (const [slug, font] of esborranys) {
    await ok(db.from("campaigns").update({ status: "esborrany", saved_at: null, messages: missatges(font) }).eq("slug", slug).is("sent_at", null));
  }
  await ok(db.from("campaign_requests").delete().gte("id", 0));

  for (const p of plats) {
    await ok(
      db
        .from("dishes")
        .update({ available: true, que_queda_ok: p.queQuedaOk, price_cents: p.preu, description: p.descripcio })
        .eq("slug", p.slug),
    );
  }
  for (const v of veuInicial) await ok(db.from("brand_voice").update({ body: v.text }).eq("id", v.id));

  await ok(db.from("ingredient_alerts").update({ status: "proposada", resolved_at: null }).neq("status", "proposada"));
  await ok(db.from("ingredients").update({ status: "alta-proposada" }).eq("slug", "carxofa"));
  await ok(db.from("ingredients").update({ status: "baixa-proposada" }).eq("slug", "tomaquet"));

  await ok(db.from("que_queda_alerts").delete().gte("day", "1900-01-01"));
  await ok(db.from("production_plans").delete().gte("day", "1900-01-01"));
  await ok(db.from("leftovers").update({ forecast_override: null, included: null }).not("forecast_override", "is", null));
  await ok(db.from("leftovers").update({ included: null }).not("included", "is", null));
}
