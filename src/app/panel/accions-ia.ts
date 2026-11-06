"use server";

import { revalidatePath } from "next/cache";
import { campanyes, carta, clients, franges } from "@/lib/db/panel";
import { redactaMissatges } from "@/lib/ia/campanyes";
import { preparaCampanya, type DadesNegoci } from "@/lib/ia/peticions";
import { gastaQuota } from "@/lib/ia/quota";
import { redactaQueQueda } from "@/lib/ia/targetes";
import { supabaseServidor } from "@/lib/supabase/server";

// Accions del panell que criden la IA. Totes demanen ser l'amo i gasten quota (src/lib/ia/quota.ts).

async function amo() {
  const supabase = await supabaseServidor();
  const { data: esAmo } = await supabase.rpc("is_owner");
  if (!esAmo) throw new Error("Només l'amo");
  return supabase;
}

/** Torna a escriure l'avís del Què Queda amb les quantitats que hi ha ara a la taula. */
export async function reescriuQueQueda(plats: { n: number; nom: string }[], base: string): Promise<string | null> {
  await amo();
  const nets = plats.filter((p) => Number.isInteger(p.n) && p.n > 0 && typeof p.nom === "string").slice(0, 12);
  if (!nets.length) return null;
  if (!(await gastaQuota("que-queda"))) return null;
  return redactaQueQueda(nets, String(base).slice(0, 600));
}

/** Reescriu els missatges d'una campanya en esborrany amb la veu de marca actual. */
export async function reescriuCampanya(slug: string): Promise<boolean> {
  const supabase = await amo();
  const c = (await campanyes()).campanyes.find((x) => x.id === slug);
  if (!c || c.estat !== "esborrany") return false;
  if (!(await gastaQuota("campanya-reescriu"))) return false;
  const r = await redactaMissatges(c);
  if (!r) return false;
  const { error } = await supabase.from("campaigns").update({ messages: r.valor }).eq("slug", slug).is("sent_at", null);
  if (error) return false;
  revalidatePath("/panel/campanyes");
  return true;
}

async function dadesNegoci(): Promise<DadesNegoci> {
  const [cl, fr, plats] = await Promise.all([clients(), franges(), carta()]);
  return {
    clients: cl.llista.map((c) => ({ risc: c.segments.includes("risc"), wallet: c.wallet, consentiment: c.consentiment, paraules: c.paraules })),
    franges: fr,
    carta: plats,
  };
}

/**
 * L'amo demana una campanya: la IA la prepara al moment i queda com a esborrany per revisar.
 * Si la IA no respon, la petició es desa i es veu "en preparació": es pot reintentar i la tasca nocturna també ho fa.
 */
export async function demanaCampanya(objectiu: string): Promise<string | null> {
  const supabase = await amo();
  const goal = objectiu.trim().slice(0, 500);
  if (goal.length < 3) return null;

  const slug = (await gastaQuota("campanya-nova")) ? await preparaCampanya(supabase, goal, await dadesNegoci(), "Demanada per tu · ara mateix") : null;
  if (!slug) await supabase.from("campaign_requests").insert({ goal });
  revalidatePath("/panel", "layout");
  return slug;
}

/** Torna a provar una petició que la IA no va poder preparar. Si surt bé, la petició desapareix. */
export async function reintentaPeticio(id: number): Promise<string | null> {
  const supabase = await amo();
  if (!Number.isInteger(id)) return null;
  const { data: p } = await supabase.from("campaign_requests").select("id, goal").eq("id", id).maybeSingle();
  if (!p) return null;
  if (!(await gastaQuota("campanya-nova"))) return null;
  const slug = await preparaCampanya(supabase, p.goal, await dadesNegoci(), "Demanada per tu · ara mateix");
  if (slug) {
    await supabase.from("campaign_requests").delete().eq("id", id);
    revalidatePath("/panel", "layout");
  }
  return slug;
}
