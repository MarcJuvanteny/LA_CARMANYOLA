"use server";

import { revalidatePath } from "next/cache";
import { campanyes, carta, clients, franges } from "@/lib/db/panel";
import { fetsNegoci, redactaCampanyaNova, redactaMissatges } from "@/lib/ia/campanyes";
import { redactaQueQueda } from "@/lib/ia/targetes";
import { supabaseServidor } from "@/lib/supabase/server";

// Accions del panell que criden la IA. Totes demanen ser l'amo: cada crida gasta quota del model.

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
  return redactaQueQueda(nets, String(base).slice(0, 600));
}

/** Reescriu els missatges d'una campanya en esborrany amb la veu de marca actual. */
export async function reescriuCampanya(slug: string): Promise<boolean> {
  const supabase = await amo();
  const c = (await campanyes()).campanyes.find((x) => x.id === slug);
  if (!c || c.estat !== "esborrany") return false;
  const r = await redactaMissatges(c);
  if (!r) return false;
  const { error } = await supabase.from("campaigns").update({ messages: r.valor }).eq("slug", slug).is("sent_at", null);
  if (error) return false;
  revalidatePath("/panel/campanyes");
  return true;
}

/**
 * L'amo demana una campanya: la IA la prepara al moment i queda com a esborrany per revisar.
 * Si la IA no respon, la petició es desa igualment i es veu "en preparació".
 */
export async function demanaCampanya(objectiu: string): Promise<string | null> {
  const supabase = await amo();
  const goal = objectiu.trim().slice(0, 500);
  if (goal.length < 3) return null;

  const [cl, fr, plats] = await Promise.all([clients(), franges(), carta()]);
  const r = await redactaCampanyaNova(goal, fetsNegoci(cl.llista, fr, plats));
  if (!r) {
    await supabase.from("campaign_requests").insert({ goal });
    revalidatePath("/panel/campanyes");
    return null;
  }

  const c = r.valor;
  const slug = `ia-${Date.now().toString(36)}`;
  const n = c.segment === "risc" ? cl.recompte.risc : cl.llista.filter((x) => x.wallet).length;
  const { error } = await supabase.from("campaigns").insert({
    slug,
    kind: c.tipus,
    segment: c.segment === "risc" ? "risc" : null,
    title: c.titol,
    chips: [c.segment === "risc" ? `${n} clients en risc` : `${n} clients amb wallet`, "Proposada per la IA"],
    reasons: c.perQue,
    ai_reasoning: goal,
    messages: c.missatges,
    simpler_label: c.etiquetaSenseExtra,
    channel_wallet: true,
    channel_email: false,
    schedule_text: `${["", "Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte"][c.dia]} a les ${c.hora}`,
    schedule_reason: c.motiuHora,
    preview_date: String(c.dia),
    preview_time: c.hora,
    status: "esborrany",
    proposed_label: "Demanada per tu · ara mateix",
  });
  if (error) {
    await supabase.from("campaign_requests").insert({ goal });
    revalidatePath("/panel/campanyes");
    return null;
  }
  revalidatePath("/panel", "layout");
  return slug;
}
