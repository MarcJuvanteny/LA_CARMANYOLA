/** Estat públic del restaurant simulat: només agregats, cap dada personal. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { diaLocal, momentLocal, serveiActual, addDays } from "./calendar";

export async function estat(db: SupabaseClient, ara = new Date()) {
  const dia = diaLocal(ara);
  const desDe = momentLocal(dia, "00:00").toISOString();
  const finsA = momentLocal(addDays(dia, 1), "00:00").toISOString();
  const [festius, avui, reals, ultima, tic] = await Promise.all([
    db.from("holidays").select("day").eq("day", dia),
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "confirmada").gte("pickup_at", desDe).lt("pickup_at", finsA).lte("pickup_at", ara.toISOString()),
    db.from("orders").select("id", { count: "exact", head: true }).eq("simulated", false).gte("created_at", desDe).lt("created_at", finsA),
    db.from("orders").select("created_at").lte("created_at", ara.toISOString()).order("created_at", { ascending: false }).limit(1),
    db.from("sim_runs").select("created_at, slot_start").order("slot_start", { ascending: false }).limit(1),
  ]);
  const servei = serveiActual(ara, new Set((festius.data ?? []).map((f) => f.day)));
  const darrera = ultima.data?.[0]?.created_at;
  return {
    obert: servei !== null,
    servei,
    comandesAvui: avui.count ?? 0,
    minutsDesDeLaDarreraComanda: darrera ? Math.round((ara.getTime() - new Date(darrera).getTime()) / 60000) : null,
    comandesRealsAvui: reals.count ?? 0,
    darrerTic: tic.data?.[0]?.created_at ?? null,
    darreraFranja: tic.data?.[0]?.slot_start ?? null,
  };
}
