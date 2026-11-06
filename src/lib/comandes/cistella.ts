// Validació de la cistella: el navegador diu què vol i quant; els preus, els noms i el que és vàlid els decideix el servidor.
// Pur (sense base de dades) perquè es pugui provar amb Vitest.

import { SUPLEMENT_DINAR } from "@/lib/data/carta";
import { opcionsDinar } from "@/lib/web/contingut";
import { deGrup, detallFeste, grups, ingredients, preuFeste, quants } from "@/lib/web/feste";

export interface LiniaEntrada {
  slug: string;
  quantitat: number;
  /** El Dinar: la beguda o el postre que l'acompanya */
  dinar?: string;
  /** Fes-te'l tu: els ids dels ingredients triats */
  opcions?: string[];
}

export interface DadesPlat {
  id: number;
  slug: string;
  name: string;
  section: string;
  price_cents: number;
  available: boolean;
}

/** La línia tal com queda desada a la comanda (orders.cart) i com la veu el client. */
export interface LiniaValidada {
  id: string;
  slug: string;
  nom: string;
  /** Cèntims per unitat, El Dinar inclòs */
  preu: number;
  quantitat: number;
  detall?: string;
  dinar?: { slug: string; nom: string };
}

export class CistellaNoValida extends Error {}

const MAX_LINIES = 30;
const MAX_QUANTITAT = 20;

export function validaCistella(entrada: LiniaEntrada[], carta: DadesPlat[]) {
  if (!Array.isArray(entrada) || !entrada.length) throw new CistellaNoValida("La cistella és buida");
  if (entrada.length > MAX_LINIES) throw new CistellaNoValida("Massa línies");
  const perSlug = new Map(carta.map((p) => [p.slug, p]));

  const linies: LiniaValidada[] = [];
  const items: { dish_id: number; qty: number; unit_price_cents: number; detail: string | null }[] = [];

  for (const e of entrada) {
    const plat = perSlug.get(e.slug);
    if (!plat || !plat.available) throw new CistellaNoValida(`No disponible: ${e.slug}`);
    const quantitat = Math.trunc(Number(e.quantitat));
    if (!(quantitat >= 1 && quantitat <= MAX_QUANTITAT)) throw new CistellaNoValida("Quantitat no vàlida");

    let preu = plat.price_cents;
    let detall: string | undefined;
    if (plat.section === "fes") {
      const ids = [...new Set(e.opcions ?? [])];
      if (ids.some((id) => !ingredients.some((i) => i.id === id))) throw new CistellaNoValida("Ingredient desconegut");
      if (grups.some((g) => deGrup(ids, g).length !== quants[g])) throw new CistellaNoValida("Fes-te'l tu incomplet");
      preu = preuFeste(plat.price_cents, ids);
      detall = detallFeste(ids);
    } else if (e.opcions?.length) {
      throw new CistellaNoValida("Opcions en un plat que no en té");
    }

    let dinar: LiniaValidada["dinar"];
    if (e.dinar) {
      const extra = perSlug.get(e.dinar);
      const potDinar = plat.section === "casa" || plat.section === "fes";
      if (!potDinar || !extra || !extra.available || !opcionsDinar.includes(extra.slug)) throw new CistellaNoValida("El Dinar no vàlid");
      dinar = { slug: extra.slug, nom: extra.name };
    }

    linies.push({
      id: [plat.slug, dinar?.slug, detall].filter(Boolean).join("+"),
      slug: plat.slug,
      nom: plat.name,
      preu: preu + (dinar ? SUPLEMENT_DINAR : 0),
      quantitat,
      ...(detall && { detall }),
      ...(dinar && { dinar }),
    });
    // Com fa el simulador: el plat al seu preu i l'acompanyament d'El Dinar a 0 (el suplement va al total).
    items.push({ dish_id: plat.id, qty: quantitat, unit_price_cents: preu, detail: detall ?? null });
    if (dinar) items.push({ dish_id: perSlug.get(dinar.slug)!.id, qty: quantitat, unit_price_cents: 0, detail: "El Dinar" });
  }

  return { linies, items, total: linies.reduce((s, l) => s + l.preu * l.quantitat, 0) };
}
