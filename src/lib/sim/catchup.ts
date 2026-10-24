/** Omple totes les franges pendents fins ara. Si el cron falla una hora, el següent tic recupera el buit. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { SIM_OPENING_DATE } from "./config";
import { frangesEntre, momentLocal } from "./calendar";
import { carregaContext } from "./db";
import { simulateSlot } from "./simulate";

const DIA_MS = 86400000;

export interface ResultatTic {
  franges: number;
  comandes: number;
  desDe: string;
}

export async function ultimaFranja(db: SupabaseClient): Promise<Date> {
  const { data, error } = await db.from("sim_runs").select("slot_start").order("slot_start", { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  // Abans de la primera franja: mitjanit del dia d'obertura
  return data?.[0] ? new Date(data[0].slot_start) : momentLocal(SIM_OPENING_DATE, "00:00");
}

export async function simulateUntil(
  db: SupabaseClient,
  ara: Date = new Date(),
  progres?: (fetes: number, total: number) => void,
): Promise<ResultatTic> {
  const desDe = await ultimaFranja(db);
  const ctx = await carregaContext(db);
  const franges = frangesEntre(desDe, ara, ctx.holidays);
  let comandes = 0;
  let fetes = 0;
  for (const slot of franges) {
    // Només les franges de les últimes 24 h respecten la disponibilitat d'avui de la carta.
    const n = await simulateSlot(db, slot, ctx, ara.getTime() - slot.start.getTime() < DIA_MS);
    if (n > 0) comandes += n;
    fetes++;
    if (progres && fetes % 100 === 0) progres(fetes, franges.length);
  }
  return { franges: franges.length, comandes, desDe: desDe.toISOString() };
}
