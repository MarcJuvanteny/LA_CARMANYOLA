"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "@/lib/supabase/server";
import type { Idioma } from "@/lib/data/carta";
import { local } from "@/lib/dates";
import { queQueda } from "@/lib/db/panel";
import { simulateUntil } from "@/lib/sim/catchup";
import { serviceClient } from "@/lib/sim/db";

// Accions del panell. Totes passen per l'RLS amb la sessió de l'amo (CONTEXT.md §11).

type Resolucio = "aprovada" | "descartada" | "esborrany" | "ara-no";

export interface PayloadProposta {
  editat?: Partial<Record<Idioma, string>>;
  wallet?: boolean;
  correu?: boolean;
  anunci?: string;
  missatge?: string;
  quantitats?: Record<number, number>;
  inclosos?: Record<number, boolean>;
}

async function client() {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Cal entrar al panell");
  return supabase;
}

const avuiIso = () => {
  const l = local(new Date());
  return `${l.any}-${String(l.mes + 1).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`;
};
const serveiAra = () => (local(new Date()).hora < 17 ? "migdia" : "vespre");

function comprova(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function resolProposta(id: string, r: Resolucio, payload: PayloadProposta = {}) {
  const supabase = await client();
  const [tipus, clau] = id.split(":");

  if (tipus === "campanya") {
    const { data: c } = await supabase.from("campaigns").select("messages").eq("slug", clau).single();
    const missatges = c?.messages ?? {};
    if (payload.editat && Object.keys(payload.editat).length) {
      missatges.original = { ...missatges.original, ...payload.editat };
    }
    const { error } = await supabase
      .from("campaigns")
      .update({
        status: r,
        saved_at: r === "esborrany" ? new Date().toISOString() : undefined,
        messages: missatges,
        ...(payload.wallet !== undefined && { channel_wallet: payload.wallet }),
        ...(payload.correu !== undefined && { channel_email: payload.correu }),
      })
      .eq("slug", clau);
    comprova(error);
  }

  if (tipus === "padro") {
    const { data: alerta, error: e1 } = await supabase
      .from("ingredient_alerts")
      .update({ status: r === "aprovada" ? "aprovada" : "ara-no", resolved_at: new Date().toISOString(), ...(payload.anunci && { announcement: payload.anunci }) })
      .eq("id", clau)
      .select("kind, ingredient_id")
      .single();
    comprova(e1);
    if (r === "aprovada" && alerta) {
      const { error } = await supabase
        .from("ingredients")
        .update({ status: alerta.kind === "alta" ? "empadronat" : "de-baixa" })
        .eq("id", alerta.ingredient_id);
      comprova(error);
    }
  }

  if (tipus === "quequeda") {
    const dia = avuiIso();
    const servei = serveiAra();
    const files = Object.keys({ ...payload.quantitats, ...payload.inclosos }).map(Number);
    for (const dishId of files) {
      const { error } = await supabase
        .from("leftovers")
        .update({
          ...(payload.quantitats?.[dishId] !== undefined && { forecast_override: payload.quantitats[dishId] }),
          ...(payload.inclosos?.[dishId] !== undefined && { included: payload.inclosos[dishId] }),
        })
        .match({ day: dia, service: servei, dish_id: dishId });
      comprova(error);
    }
    const { error } = await supabase
      .from("que_queda_alerts")
      .upsert({ day: dia, service: servei, message: payload.missatge ?? "", activated_at: new Date().toISOString() });
    comprova(error);
  }

  if (tipus === "vendes") {
    const qq = await queQueda();
    const { error } = await supabase.from("production_plans").upsert(
      qq.produccio.items.map((p) => ({
        day: qq.produccio.dema,
        dish_id: p.id,
        planned: p.despres,
        status: r === "aprovada" ? "enviat" : "xef",
      })),
    );
    comprova(error);
  }

  revalidatePath("/panel", "layout");
}

export async function desfesProposta(id: string) {
  const supabase = await client();
  const [tipus, clau] = id.split(":");

  if (tipus === "campanya") {
    comprova((await supabase.from("campaigns").update({ status: "esborrany", saved_at: null }).eq("slug", clau)).error);
  }
  if (tipus === "padro") {
    const { data: alerta } = await supabase.from("ingredient_alerts").select("kind, ingredient_id, status").eq("id", clau).single();
    comprova((await supabase.from("ingredient_alerts").update({ status: "proposada", resolved_at: null }).eq("id", clau)).error);
    if (alerta?.status === "aprovada") {
      comprova(
        (await supabase.from("ingredients").update({ status: alerta.kind === "alta" ? "alta-proposada" : "baixa-proposada" }).eq("id", alerta.ingredient_id))
          .error,
      );
    }
  }
  if (tipus === "quequeda") {
    comprova((await supabase.from("que_queda_alerts").delete().match({ day: avuiIso(), service: serveiAra() })).error);
  }
  if (tipus === "vendes") {
    const qq = await queQueda();
    comprova((await supabase.from("production_plans").delete().eq("day", qq.produccio.dema)).error);
  }
  revalidatePath("/panel", "layout");
}

export async function demanaCampanya(objectiu: string) {
  const supabase = await client();
  const goal = objectiu.trim().slice(0, 500);
  if (goal.length < 3) return;
  comprova((await supabase.from("campaign_requests").insert({ goal })).error);
  revalidatePath("/panel/campanyes");
}

export async function actualitzaPlat(
  slug: string,
  canvis: Partial<{ available: boolean; que_queda_ok: boolean; price_cents: number; description: Record<Idioma, string> }>,
) {
  const supabase = await client();
  if (canvis.price_cents !== undefined && (!Number.isInteger(canvis.price_cents) || canvis.price_cents < 0)) {
    throw new Error("Preu no vàlid");
  }
  comprova((await supabase.from("dishes").update({ ...canvis, updated_at: new Date().toISOString() }).eq("slug", slug)).error);
  revalidatePath("/panel", "layout");
}

export async function desaVeu(seccions: { id: string; text: string }[]) {
  const supabase = await client();
  for (const s of seccions) {
    comprova((await supabase.from("brand_voice").update({ body: s.text.slice(0, 4000), updated_at: new Date().toISOString() }).eq("id", s.id)).error);
  }
  revalidatePath("/panel/veu-de-marca");
}

/** "Posa al dia": simula les franges pendents fins ara (el mateix que fa el cron). Només l'amo. */
export async function posaAlDia() {
  const supabase = await client();
  const { data: amo } = await supabase.from("owners").select("user_id").limit(1);
  if (!amo?.length) throw new Error("Només l'amo");
  const r = await simulateUntil(serviceClient());
  revalidatePath("/panel", "layout");
  return r;
}
