/** Dades reals externes: el temps de Barcelona (Open-Meteo) i els festius oficials. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { HOLIDAYS_2026, HOLIDAYS_SOURCE, WEATHER } from "./config";

interface Dia {
  day: string;
  rain_mm: number;
  temp_max: number | null;
  source: string;
}

const params = `latitude=${WEATHER.latitude}&longitude=${WEATHER.longitude}&daily=precipitation_sum,temperature_2m_max&timezone=Europe%2FMadrid`;

async function llegeix(url: string, font: string): Promise<Dia[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}: ${url}`);
  const j = (await r.json()) as { daily?: { time: string[]; precipitation_sum: (number | null)[]; temperature_2m_max: (number | null)[] } };
  const d = j.daily;
  if (!d) return [];
  return d.time
    .map((day, i) => ({ day, rain_mm: d.precipitation_sum[i] ?? NaN, temp_max: d.temperature_2m_max[i], source: font }))
    .filter((x) => Number.isFinite(x.rain_mm));
}

/** Històric (API d'arxiu) entre dues dates. L'arxiu va uns dies endarrerit. */
export const tempsHistoric = (desDe: string, finsA: string) =>
  llegeix(`https://archive-api.open-meteo.com/v1/archive?${params}&start_date=${desDe}&end_date=${finsA}`, "open-meteo-arxiu");

/** Darrers dies i previsió (API de previsió). */
export const tempsRecent = (diesEnrere = 7, diesEndavant = 3) =>
  llegeix(`https://api.open-meteo.com/v1/forecast?${params}&past_days=${diesEnrere}&forecast_days=${diesEndavant}`, "open-meteo-previsio");

export async function desaTemps(db: SupabaseClient, dies: Dia[]) {
  for (let i = 0; i < dies.length; i += 500) {
    const { error } = await db.from("weather_daily").upsert(dies.slice(i, i + 500), { onConflict: "day" });
    if (error) throw new Error(error.message);
  }
  return dies.length;
}

export async function desaFestius(db: SupabaseClient) {
  const files = HOLIDAYS_2026.map(([day, name]) => ({ day, name, source: HOLIDAYS_SOURCE }));
  const { error } = await db.from("holidays").upsert(files, { onConflict: "day" });
  if (error) throw new Error(error.message);
  return files.length;
}
