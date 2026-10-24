/** Una franja de 15 minuts: planificar (pur i determinista) i aplicar (una transacció). */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LEAD_MINUTES, REGISTERED_CAP_OF_DIRECT, SLOT_MINUTES, WEB_CANCELLATION } from "./config";
import { cistella } from "./basket";
import { serveiDb, type Slot } from "./calendar";
import { probabilitatsClients } from "./customers";
import { canals, comandesEsperades, plou } from "./demand";
import { slotRng, type Rng } from "./rng";
import type { PlannedOrder, SimContext, SimCustomer, SlotPlan } from "./types";

const MIN = 60000;

function comanda(
  rng: Rng,
  slot: Slot,
  ctx: SimContext,
  client: SimCustomer | null,
  channel: PlannedOrder["channel"],
  viu: boolean,
): PlannedOrder | null {
  const c = cistella(rng, slot, ctx, client, viu);
  if (!c.items.length) return null;
  const pickup = new Date(slot.start.getTime() + Math.floor(rng.next() * SLOT_MINUTES * 60) * 1000);
  const [a, b] = LEAD_MINUTES[channel];
  const created = new Date(pickup.getTime() - Math.round(rng.float(a, b) * MIN));
  const cancel = channel === "web" && rng.bool(WEB_CANCELLATION);
  const directa = channel !== "plataforma";
  const id = rng.uuid();
  return {
    id,
    customer_id: client?.id ?? null,
    channel,
    created_at: created.toISOString(),
    pickup_at: pickup.toISOString(),
    dinar: c.dinar,
    total_cents: c.total_cents,
    status: cancel ? "cancel·lada" : "confirmada",
    cancelled_at: cancel ? new Date(created.getTime() + rng.int(2, 8) * MIN).toISOString() : null,
    qr_code: directa ? rng.hex(12) : null,
    // Les plataformes no ens diuen qui és: mai sumen segell.
    scan: !!client && directa && !cancel && rng.bool(client.scan_prob),
    items: c.items,
  };
}

/**
 * Planifica una franja. Mateixa franja + mateix context = mateix resultat.
 * `viu`: respectar la disponibilitat d'avui de la carta (només per a franges recents).
 */
export function planSlot(slot: Slot, ctx: SimContext, viu = false): SlotPlan {
  const rng = slotRng(slot.start);
  const lambda = comandesEsperades(slot, ctx);
  const mix = canals(slot.day, plou(ctx, slot.day));
  const orders: PlannedOrder[] = [];

  // Plataformes: sense client
  const nPlataforma = rng.poisson(lambda * mix.plataforma);
  for (let i = 0; i < nPlataforma; i++) {
    const o = comanda(rng, slot, ctx, null, "plataforma", viu);
    if (o) orders.push(o);
  }

  // Directes: clients registrats segons el seu perfil + gent anònima
  const lambdaDirecte = lambda * (mix.web + mix.local);
  const webDirecte = mix.web / (mix.web + mix.local);
  const probs = probabilitatsClients(slot, ctx);
  const suma = probs.reduce((s, x) => s + x.p, 0);
  const escala = suma > 0 ? Math.min(1, (REGISTERED_CAP_OF_DIRECT * lambdaDirecte) / suma) : 0;
  for (const { client, p } of probs) {
    if (!rng.bool(p * escala)) continue;
    const o = comanda(rng, slot, ctx, client, rng.bool(webDirecte) ? "web" : "local", viu);
    if (o) orders.push(o);
  }
  const nAnonimes = rng.poisson(Math.max(0, lambdaDirecte - suma * escala));
  for (let i = 0; i < nAnonimes; i++) {
    const o = comanda(rng, slot, ctx, null, rng.bool(webDirecte) ? "web" : "local", viu);
    if (o) orders.push(o);
  }

  orders.sort((x, y) => x.created_at.localeCompare(y.created_at));
  return { slot_start: slot.start.toISOString(), service: serveiDb(slot.service), first_of_service: slot.index === 0, orders };
}

/** Aplica la franja en una sola transacció. Retorna les comandes creades, o -1 si ja estava feta. */
export async function applySlot(db: SupabaseClient, plan: SlotPlan): Promise<number> {
  const { data, error } = await db.rpc("sim_apply_slot", { p_slot: plan.slot_start, p_payload: plan });
  if (error) throw new Error(`sim_apply_slot ${plan.slot_start}: ${error.message}`);
  return data as number;
}

export async function simulateSlot(db: SupabaseClient, slot: Slot, ctx: SimContext, viu = false) {
  return applySlot(db, planSlot(slot, ctx, viu));
}
