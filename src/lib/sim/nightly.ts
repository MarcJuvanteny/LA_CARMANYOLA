/** Tasca nocturna (cap a les 3:00 a Barcelona). Idempotent: com a molt una vegada per nit. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { NIGHTLY_NEW_CUSTOMERS } from "./config";
import { addDays, diaLocal, horaLocal, momentLocal } from "./calendar";
import { nouClient } from "./customers";
import { carregaContext } from "./db";
import { preparaPeticionsPendents } from "@/lib/ia/peticions";
import { resetDemo } from "./demo";
import { desaTemps, tempsRecent } from "./externs";
import { Rng } from "./rng";

async function ok(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p;
  if (error) throw new Error(error.message);
}

/**
 * IA de la nit. Els detectors (clients en risc, franges fluixes, padró) ja són SQL i les targetes
 * es redacten quan l'amo obre el panell; aquí es preparen les campanyes que la IA no va poder fer al moment.
 * Un error de la IA no ha de tombar la tasca nocturna.
 */
async function detectorsIIA(db: SupabaseClient) {
  try {
    return await preparaPeticionsPendents(db);
  } catch (e) {
    console.warn("[nit] IA:", e instanceof Error ? e.message : e);
    return { error: true };
  }
}

export async function nightly(db: SupabaseClient, ara = new Date(), forca = false) {
  const dia = diaLocal(ara);
  if (!forca && !(horaLocal(ara) >= "03:00" && horaLocal(ara) < "04:00")) return { fet: false, motiu: "no és l'hora" };

  const { data: ja } = await db.from("sim_nights").select("day").eq("day", dia).maybeSingle();
  if (ja && !forca) return { fet: false, motiu: "ja s'ha fet aquesta nit" };

  // 1. Temps d'ahir i previsió d'avui
  let dies = 0;
  try {
    dies = await desaTemps(db, await tempsRecent(2, 2));
  } catch {
    // sense xarxa: es quedarà el temps que hi hagi
  }

  // 2. 0-2 clients nous (es van donar d'alta ahir)
  const ahir = addDays(dia, -1);
  const rng = new Rng(`carmanyola:nit:${dia}`);
  const n = rng.int(...NIGHTLY_NEW_CUSTOMERS);
  if (n > 0) {
    const ctx = await carregaContext(db);
    for (let i = 0; i < n; i++) {
      const creat = momentLocal(ahir, `${rng.int(12, 21)}:${String(rng.int(0, 59)).padStart(2, "0")}`);
      const c = nouClient(`nit-${dia}-${i}`, creat, ctx.dishes, dia);
      await ok(db.from("customers").upsert(c.customer, { onConflict: "id", ignoreDuplicates: true }));
      const { id: _id, ...perfil } = c.profile;
      await ok(db.from("sim_profiles").upsert(perfil, { onConflict: "customer_id", ignoreDuplicates: true }));
      await ok(db.rpc("registra_segell_regal", { p_customer_id: c.customer.id, p_at: creat.toISOString() }));
    }
  }

  // 3. La demo torna al punt de partida
  await resetDemo(db);

  // 4. IA: les peticions de campanya pendents (després del reinici, perquè els esborranys d'aquesta nit es quedin)
  const ia = await detectorsIIA(db);

  await ok(db.from("sim_nights").upsert({ day: dia }));
  return { fet: true, dia, tempsDies: dies, clientsNous: n, ia };
}
