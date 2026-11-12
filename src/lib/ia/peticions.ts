import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plat } from "@/lib/data/carta";
import { etiquetesPeticio } from "@/lib/data/traduccions-db";
import { fetsNegoci, redactaCampanyaNova, type ClientFets } from "./campanyes";
import { iaDisponible } from "./gemini";

// Campanyes demanades per l'amo: la IA les prepara i queden com a esborrany per revisar.
// Ho fan servir el botó del panell (sessió de l'amo) i la tasca nocturna (service role).

export interface DadesNegoci {
  clients: ClientFets[];
  franges: { mitjanaFluixes: number; mitjanaMigdia: number };
  carta: Pick<Plat, "nom" | "disponible" | "seccio">[];
}

// Dies ISO (1 = dilluns). La campanya la redacta la IA en català; les etiquetes que posa el codi van també en es i en.
const DIES = {
  ca: ["", "Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte"],
  es: ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  en: ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};
const HORA = { ca: "a les", es: "a las", en: "at" };
const XIP = {
  risc: { ca: "{n} clients en risc", es: "{n} clientes en riesgo", en: "{n} customers at risk" },
  wallet: { ca: "{n} clients amb wallet", es: "{n} clientes con wallet", en: "{n} customers with wallet" },
};

/** Prepara la campanya i la desa com a esborrany. Torna l'slug, o null si la IA no ha respost o no s'ha pogut desar. */
export async function preparaCampanya(
  db: SupabaseClient,
  objectiu: string,
  dades: DadesNegoci,
  etiqueta: "araMateix" | "aquestaNit",
): Promise<string | null> {
  const r = await redactaCampanyaNova(objectiu, fetsNegoci(dades.clients, dades.franges, dades.carta));
  if (!r) return null;

  const c = r.valor;
  const slug = `ia-${Date.now().toString(36)}`;
  // Qui la rep ho decideix el codi, no la IA.
  const n = c.segment === "risc" ? dades.clients.filter((x) => x.risc).length : dades.clients.filter((x) => x.wallet).length;
  const xip = (l: "ca" | "es" | "en") => XIP[c.segment === "risc" ? "risc" : "wallet"][l].replace("{n}", String(n));
  const quan = (l: "ca" | "es" | "en") => `${DIES[l][c.dia]} ${HORA[l]} ${c.hora}`;
  // Només les etiquetes del codi: el títol i els motius els escriu la IA en català.
  const i18n = Object.fromEntries(
    (["es", "en"] as const).map((l) => [
      l,
      { chips: [xip(l), etiquetesPeticio.proposadaIA[l]], schedule_text: quan(l), proposed_label: etiquetesPeticio[etiqueta][l] },
    ]),
  );
  const { error } = await db.from("campaigns").insert({
    slug,
    kind: c.tipus,
    segment: c.segment === "risc" ? "risc" : null,
    title: c.titol,
    chips: [xip("ca"), etiquetesPeticio.proposadaIA.ca],
    reasons: c.perQue,
    ai_reasoning: objectiu,
    messages: c.missatges,
    simpler_label: c.etiquetaSenseExtra,
    channel_wallet: true,
    channel_email: false,
    schedule_text: quan("ca"),
    schedule_reason: c.motiuHora,
    preview_date: String(c.dia),
    preview_time: c.hora,
    status: "esborrany",
    proposed_label: etiquetesPeticio[etiqueta].ca,
    i18n,
  });
  if (error) {
    console.warn("[ia] no s'ha pogut desar la campanya:", error.message.slice(0, 160));
    return null;
  }
  return slug;
}

/* Tasca nocturna */

interface ClientRpc {
  en_risc: boolean;
  wallet: boolean;
  consent_email: boolean;
  paraules: number;
}

/** Els mateixos agregats que veu el panell, llegits amb la service role (funcions ia_panel_*). */
async function dadesNegoci(db: SupabaseClient): Promise<DadesNegoci> {
  const [cl, fr, plats] = await Promise.all([
    db.rpc("ia_panel_clients"),
    db.rpc("ia_panel_franges"),
    db.from("dishes").select("name, section, available").eq("archived", false).order("sort"),
  ]);
  const error = cl.error ?? fr.error ?? plats.error;
  if (error) throw new Error(error.message);
  const franges = fr.data as { mitjana_fluixes: number | null; mitjana_migdia: number | null };
  return {
    clients: ((cl.data as { clients: ClientRpc[] | null }).clients ?? []).map((c) => ({
      risc: c.en_risc,
      wallet: c.wallet,
      consentiment: c.consent_email,
      paraules: c.paraules,
    })),
    franges: { mitjanaFluixes: Math.round(franges.mitjana_fluixes ?? 0), mitjanaMigdia: Math.round(franges.mitjana_migdia ?? 0) },
    carta: (plats.data ?? []).map((p) => ({ nom: p.name, seccio: p.section, disponible: p.available })),
  };
}

const MAX_INTENTS = 3;
const MAX_PER_NIT = 5;

/** Reintenta les peticions que la IA no va poder preparar quan l'amo les va fer. */
export async function preparaPeticionsPendents(db: SupabaseClient) {
  if (!iaDisponible()) return { preparades: 0, pendents: 0, motiu: "sense GEMINI_API_KEY" };
  const { data: peticions, error } = await db
    .from("campaign_requests")
    .select("id, goal, attempts")
    .lt("attempts", MAX_INTENTS)
    .order("created_at")
    .limit(MAX_PER_NIT);
  if (error) throw new Error(error.message);
  if (!peticions?.length) return { preparades: 0, pendents: 0 };

  const dades = await dadesNegoci(db);
  let preparades = 0;
  for (const p of peticions) {
    const slug = await preparaCampanya(db, p.goal, dades, "aquestaNit");
    if (slug) {
      preparades++;
      await db.from("campaign_requests").delete().eq("id", p.id);
    } else {
      await db.from("campaign_requests").update({ attempts: p.attempts + 1 }).eq("id", p.id);
    }
  }
  return { preparades, pendents: peticions.length - preparades };
}
