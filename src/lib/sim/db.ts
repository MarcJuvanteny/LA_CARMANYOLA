/**
 * Accés del simulador a Supabase amb la service role.
 * NOMÉS servidor (rutes /api/sim, server actions i scripts): la clau mai arriba al client.
 * No importa "server-only" perquè també el fan servir els scripts de Node.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Perfil, Servei } from "./config";
import type { SimCampaign, SimContext, SimCustomer, SimDish } from "./types";

export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falten NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** PostgREST torna com a màxim 1.000 files per petició: anem per pàgines. */
export async function totes<T>(consulta: (desDe: number, finsA: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let desDe = 0; ; desDe += 1000) {
    const { data, error } = await consulta(desDe, desDe + 999);
    if (error) throw new Error(error.message);
    const files = (data ?? []) as T[];
    out.push(...files);
    if (files.length < 1000) return out;
  }
}

export async function carregaContext(db: SupabaseClient): Promise<SimContext> {
  const [dishes, perfils, festius, temps, campanyes, destinataris] = await Promise.all([
    totes<SimDish>((a, b) => db.from("dishes").select("id, slug, section, price_cents, season, tags, available, supplement").order("id").range(a, b)),
    totes<{
      customer_id: string;
      profile: Perfil;
      weekly_rate: number;
      days: number[];
      service: Servei;
      favourite_dish_ids: number[];
      scan_prob: number;
      churns_at: string | null;
      customers: { created_at: string } | null;
    }>((a, b) => db.from("sim_profiles").select("*, customers(created_at)").order("customer_id").range(a, b)),
    totes<{ day: string }>((a, b) => db.from("holidays").select("day").range(a, b)),
    totes<{ day: string; rain_mm: number }>((a, b) => db.from("weather_daily").select("day, rain_mm").range(a, b)),
    totes<{
      id: string;
      sent_at: string;
      double_days: number[] | null;
      double_from: string | null;
      double_to: string | null;
      starts_on: string | null;
      ends_on: string | null;
    }>((a, b) =>
      db.from("campaigns").select("id, sent_at, double_days, double_from, double_to, starts_on, ends_on").not("sent_at", "is", null).order("id").range(a, b),
    ),
    totes<{ campaign_id: string; customer_id: string }>((a, b) =>
      db.from("campaign_recipients").select("campaign_id, customer_id").eq("control", false).order("campaign_id").order("customer_id").range(a, b),
    ),
  ]);

  const customers: SimCustomer[] = perfils
    .filter((p) => p.customers)
    .map((p) => ({
      id: p.customer_id,
      created_at: new Date(p.customers!.created_at),
      profile: p.profile,
      weekly_rate: Number(p.weekly_rate),
      days: p.days,
      service: p.service,
      favourite_dish_ids: p.favourite_dish_ids,
      scan_prob: Number(p.scan_prob),
      churns_at: p.churns_at,
    }));

  const campaigns: SimCampaign[] = campanyes.map((c) => ({
    id: c.id,
    sent_at: new Date(c.sent_at),
    double_days: c.double_days,
    double_from: c.double_from,
    double_to: c.double_to,
    starts_on: c.starts_on,
    ends_on: c.ends_on,
    recipients: new Set(destinataris.filter((r) => r.campaign_id === c.id).map((r) => r.customer_id)),
  }));

  return {
    dishes: dishes.map((d) => ({ ...d, tags: d.tags ?? [] })),
    customers,
    holidays: new Set(festius.map((f) => f.day)),
    rain: new Map(temps.map((t) => [t.day, Number(t.rain_mm)])),
    campaigns,
  };
}
