/** Què demana cada comanda. Els plats i preus surten de la base de dades (ctx.dishes). */

import {
  COLD_DISHES_AUTUMN,
  COMPLEMENT_SHARE,
  DINAR_SHARE,
  DINAR_SUPPLEMENT_CENTS,
  DISH_POPULARITY,
  EXTRA_DESSERT_SHARE,
  FAVOURITE_SHARE,
  ITEMS_PER_ORDER,
  RAIN,
  SIM_TARDOR,
  SUPPLEMENT_SHARE,
} from "./config";
import { esCastanyada, type Slot } from "./calendar";
import { castanyadaFactor, plou } from "./demand";
import type { Rng } from "./rng";
import type { PlannedItem, SimContext, SimCustomer, SimDish } from "./types";

/**
 * Un plat es pot demanar aquest dia? Els de tot l'any, sempre; els de tardor, només dins la temporada
 * (provisional mentre el padró és en standby). Cap plat d'altres temporades: no n'inventem.
 */
export function enTemporada(d: SimDish, day: string): boolean {
  if (d.season === "tot l'any") return true;
  if (d.season === "tardor") return day >= SIM_TARDOR.from && day <= SIM_TARDOR.to;
  return false;
}

const esVega = (d: SimDish) => d.tags.includes("vegà");

/** Pes d'un plat principal segons popularitat, pluja, tardor i Castanyada. */
function pesPlat(d: SimDish, day: string, pluja: boolean): number {
  let w = DISH_POPULARITY[d.slug] ?? 0.5;
  if (pluja) w *= RAIN.dishes[d.slug] ?? 1;
  if (d.tags.includes("fred") && day >= SIM_TARDOR.from) w *= COLD_DISHES_AUTUMN;
  if (d.season === "tardor" && esCastanyada(day)) w *= castanyadaFactor;
  return w;
}

export interface Cistella {
  items: PlannedItem[];
  dinar: boolean;
  total_cents: number;
}

export function cistella(rng: Rng, slot: Slot, ctx: SimContext, client: SimCustomer | null, viu: boolean): Cistella {
  const day = slot.day;
  const pluja = plou(ctx, day);
  const vega = client?.profile === "vega";
  const disponible = (d: SimDish) => enTemporada(d, day) && (!viu || d.available);
  const principals = ctx.dishes.filter((d) => (d.section === "casa" || d.section === "fes") && disponible(d) && (!vega || esVega(d)));
  const items: PlannedItem[] = [];
  let total = 0;
  const afegeix = (d: SimDish, preu = d.price_cents) => {
    items.push({ dish_id: d.id, qty: 1, unit_price_cents: preu });
    total += preu;
  };

  // Carmanyoles: 1 + Poisson(mitjana - 1)
  const n = Math.min(5, 1 + rng.poisson(ITEMS_PER_ORDER[slot.service] - 1));
  for (let i = 0; i < n; i++) {
    const favorits = client ? principals.filter((d) => client.favourite_dish_ids.includes(d.id)) : [];
    const plat =
      favorits.length && rng.bool(FAVOURITE_SHARE)
        ? rng.weighted(favorits, (d) => pesPlat(d, day, pluja))
        : rng.weighted(principals, (d) => pesPlat(d, day, pluja));
    if (!plat) continue;
    const suplement = plat.supplement && !vega && rng.bool(SUPPLEMENT_SHARE) ? plat.supplement.price_cents : 0;
    afegeix(plat, plat.price_cents + suplement);
  }
  if (!items.length) return { items, dinar: false, total_cents: 0 };

  const postres = ctx.dishes.filter((d) => d.section === "postres" && disponible(d));
  const begudes = ctx.dishes.filter((d) => d.section === "begudes" && disponible(d));
  const complements = ctx.dishes.filter((d) => d.section === "acompanyar" && disponible(d));
  const castanyada = esCastanyada(day) ? castanyadaFactor : 1;

  // El Dinar: beguda o postre per +2 € (només al dinar). Els vegans, beguda.
  const dinar = slot.service === "dinar" && rng.bool(DINAR_SHARE);
  if (dinar) {
    const opcions = vega ? begudes : [...postres, ...begudes];
    const extra = rng.weighted(opcions, (d) => (d.section === "postres" ? castanyada : 1));
    if (extra) afegeix(extra, 0);
    total += DINAR_SUPPLEMENT_CENTS;
  }

  if (complements.length && rng.bool(COMPLEMENT_SHARE)) afegeix(rng.pick(complements));
  if (!vega && !dinar && postres.length && rng.bool(Math.min(1, EXTRA_DESSERT_SHARE * castanyada))) afegeix(rng.pick(postres));

  return { items, dinar, total_cents: total };
}
