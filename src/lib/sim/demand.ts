/** Comandes esperades per franja i repartiment de canals. */

import {
  CASTANYADA,
  CHANNELS,
  CURVES,
  DAY_FACTOR,
  DAY_NOISE,
  DOUBLE_STAMP_SLOT_BOOST,
  EVENING_FACTOR,
  RAIN,
  SIM_CHANNEL_RAMP_END,
  SIM_OPENING_DATE,
  VOLUME,
} from "./config";
import { diesEntre, horaLocal, isoDow, type Slot } from "./calendar";
import { Rng } from "./rng";
import type { SimCampaign, SimContext } from "./types";

const pesCorba = (slot: Slot) => {
  const corba = CURVES[slot.service];
  return corba[slot.index] / corba.reduce((a, b) => a + b, 0);
};
export { pesCorba };

export const plou = (ctx: SimContext, day: string) => (ctx.rain.get(day) ?? 0) > RAIN.thresholdMm;

/** Soroll del dia: mateixa llavor per a totes les franges d'un dia. */
export function sorollDia(day: string): number {
  const rng = new Rng(`carmanyola:dia:${day}`);
  if (rng.bool(DAY_NOISE.atypicalProb)) return rng.float(...DAY_NOISE.atypicalRange);
  return Math.max(0.6, 1 + DAY_NOISE.sd * rng.normal());
}

/** Campanyes de segell doble actives en aquesta franja. */
export function segellDoble(slot: Slot, campaigns: SimCampaign[]): boolean {
  const dow = isoDow(slot.day);
  const hora = horaLocal(slot.start);
  return campaigns.some(
    (c) =>
      c.double_days?.includes(dow) &&
      c.starts_on != null &&
      c.ends_on != null &&
      slot.day >= c.starts_on &&
      slot.day <= c.ends_on &&
      (c.double_from == null || hora >= c.double_from.slice(0, 5)) &&
      (c.double_to == null || hora < c.double_to.slice(0, 5)),
  );
}

/** λ de comandes (totes, de tots els canals) per a la franja. */
export function comandesEsperades(slot: Slot, ctx: SimContext): number {
  const dow = isoDow(slot.day);
  const base = dow === 6 ? VOLUME[slot.service].dissabte : VOLUME[slot.service].entreSetmana;
  let lambda = base * pesCorba(slot) * (DAY_FACTOR[dow] ?? 1) * sorollDia(slot.day);
  if (slot.service === "sopar") lambda *= EVENING_FACTOR[dow] ?? 1;
  if (plou(ctx, slot.day)) lambda *= RAIN.volume;
  if (segellDoble(slot, ctx.campaigns)) lambda *= DOUBLE_STAMP_SLOT_BOOST;
  return lambda;
}

/** Repartiment de canals del dia (interpolació lineal; amb pluja, més plataformes). */
export function canals(day: string, pluja: boolean) {
  const total = Math.max(1, diesEntre(SIM_OPENING_DATE, SIM_CHANNEL_RAMP_END));
  const t = Math.min(1, Math.max(0, diesEntre(SIM_OPENING_DATE, day) / total));
  const mix = {
    web: CHANNELS.start.web + (CHANNELS.end.web - CHANNELS.start.web) * t,
    local: CHANNELS.start.local + (CHANNELS.end.local - CHANNELS.start.local) * t,
    plataforma: CHANNELS.start.plataforma + (CHANNELS.end.plataforma - CHANNELS.start.plataforma) * t,
  };
  if (pluja) mix.plataforma *= RAIN.platform;
  const suma = mix.web + mix.local + mix.plataforma;
  return { web: mix.web / suma, local: mix.local / suma, plataforma: mix.plataforma / suma };
}

export const castanyadaFactor = CASTANYADA.factor;
