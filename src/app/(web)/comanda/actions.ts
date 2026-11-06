"use server";

import { getLocale } from "next-intl/server";
import { CistellaNoValida, type LiniaEntrada } from "@/lib/comandes/cistella";
import { confirmaComanda, creaComanda, guardaSessio } from "@/lib/comandes/comandes";
import { ipClient, origen } from "@/lib/origen";
import { creaSessio, stripeConfigurat } from "@/lib/pagaments/stripe";
import { serviceClient } from "@/lib/sim/db";

// La comanda es crea al servidor (preus de la base de dades) i es paga amb Stripe Checkout.
// Sense STRIPE_SECRET_KEY (mode demo), es confirma directament sense cobrar.

export type ResultatPagament = { ok: true; url: string } | { ok: false; error: "cistella" | "limit" | "servidor" };

export async function paga(dades: { linies: LiniaEntrada[]; hora: string; nom: string; mobil: string }): Promise<ResultatPagament> {
  try {
    const db = serviceClient();
    const { data: dinsLimit } = await db.rpc("limita", { p_clau: `paga:${await ipClient()}`, p_max: 15, p_segons: 600 });
    if (dinsLimit === false) return { ok: false, error: "limit" };

    const locale = (await getLocale()) as "ca" | "es" | "en";
    const { id, cistella } = await creaComanda({ ...dades, locale });
    const o = await origen();

    if (!stripeConfigurat()) {
      await confirmaComanda(id);
      return { ok: true, url: `/comanda/${id}` };
    }
    const sessio = await creaSessio({
      comanda: id,
      origen: o,
      locale,
      linies: cistella.linies.map((l) => ({
        nom: l.dinar ? `${l.nom} · El Dinar (${l.dinar.nom})` : l.nom,
        detall: l.detall,
        unitat: l.preu,
        quantitat: l.quantitat,
      })),
    });
    await guardaSessio(id, sessio.id);
    return { ok: true, url: sessio.url! };
  } catch (e) {
    if (e instanceof CistellaNoValida) return { ok: false, error: "cistella" };
    console.error("[comanda]", e);
    return { ok: false, error: "servidor" };
  }
}
