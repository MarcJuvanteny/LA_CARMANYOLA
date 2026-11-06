import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plat } from "@/lib/data/carta";
import { fetsNegoci, redactaCampanyaNova, type ClientFets } from "./campanyes";
import { iaDisponible } from "./gemini";

// Campanyes demanades per l'amo: la IA les prepara i queden com a esborrany per revisar.
// Ho fan servir el botó del panell (sessió de l'amo) i la tasca nocturna (service role).

export interface DadesNegoci {
  clients: ClientFets[];
  franges: { mitjanaFluixes: number; mitjanaMigdia: number };
  carta: Pick<Plat, "nom" | "disponible" | "seccio">[];
}

const DIES = ["", "Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte"];

/** Prepara la campanya i la desa com a esborrany. Torna l'slug, o null si la IA no ha respost o no s'ha pogut desar. */
export async function preparaCampanya(db: SupabaseClient, objectiu: string, dades: DadesNegoci, etiqueta: string): Promise<string | null> {
  const r = await redactaCampanyaNova(objectiu, fetsNegoci(dades.clients, dades.franges, dades.carta));
  if (!r) return null;

  const c = r.valor;
  const slug = `ia-${Date.now().toString(36)}`;
  // Qui la rep ho decideix el codi, no la IA.
  const n = c.segment === "risc" ? dades.clients.filter((x) => x.risc).length : dades.clients.filter((x) => x.wallet).length;
  const { error } = await db.from("campaigns").insert({
    slug,
    kind: c.tipus,
    segment: c.segment === "risc" ? "risc" : null,
    title: c.titol,
    chips: [c.segment === "risc" ? `${n} clients en risc` : `${n} clients amb wallet`, "Proposada per la IA"],
    reasons: c.perQue,
    ai_reasoning: objectiu,
    messages: c.missatges,
    simpler_label: c.etiquetaSenseExtra,
    channel_wallet: true,
    channel_email: false,
    schedule_text: `${DIES[c.dia]} a les ${c.hora}`,
    schedule_reason: c.motiuHora,
    preview_date: String(c.dia),
    preview_time: c.hora,
    status: "esborrany",
    proposed_label: etiqueta,
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
    db.from("dishes").select("name, section, available").order("sort"),
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
    const slug = await preparaCampanya(db, p.goal, dades, "Demanada per tu · preparada aquesta nit");
    if (slug) {
      preparades++;
      await db.from("campaign_requests").delete().eq("id", p.id);
    } else {
      await db.from("campaign_requests").update({ attempts: p.attempts + 1 }).eq("id", p.id);
    }
  }
  return { preparades, pendents: peticions.length - preparades };
}
