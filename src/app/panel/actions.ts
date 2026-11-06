"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { enviaCampanya, enviaQueQueda } from "@/lib/enviaments/enviaments";
import { supabaseServidor } from "@/lib/supabase/server";
import { ALERGENS, seccions, temporades, type Idioma, type Seccio, type Temporada } from "@/lib/data/carta";
import { local } from "@/lib/dates";
import { queQueda } from "@/lib/db/panel";
import { simulateUntil } from "@/lib/sim/catchup";
import { serviceClient } from "@/lib/sim/db";

// Accions del panell. Totes passen per l'RLS amb la sessió de l'amo (CONTEXT.md §11).

/** Marge per desfer: l'enviament real surt uns segons després d'aprovar, i només si encara està aprovat. */
const MARGE_DESFER_MS = 15_000;
const enviaDespres = (envia: () => Promise<unknown>) =>
  after(async () => {
    await new Promise((r) => setTimeout(r, MARGE_DESFER_MS));
    await envia().catch((e) => console.error("[enviament]", e));
  });

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
    if (r === "aprovada") enviaDespres(() => enviaCampanya(clau));
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
    enviaDespres(() => enviaQueQueda(dia, servei));
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

export interface CanvisPlat {
  name: string;
  section: Seccio;
  season: Temporada;
  allergens: string[];
  available: boolean;
  que_queda_ok: boolean;
  price_cents: number;
  description: Record<Idioma, string>;
  archived: boolean;
}

/** Valida al servidor el que arriba del panell: el client no és de fiar. */
function validaPlat(c: Partial<CanvisPlat>) {
  if (c.price_cents !== undefined && (!Number.isInteger(c.price_cents) || c.price_cents < 0 || c.price_cents > 100_000)) throw new Error("Preu no vàlid");
  if (c.name !== undefined && (!c.name.trim() || c.name.length > 60)) throw new Error("Nom no vàlid");
  if (c.section !== undefined && !seccions.includes(c.section)) throw new Error("Secció no vàlida");
  if (c.season !== undefined && !temporades.includes(c.season)) throw new Error("Temporada no vàlida");
  if (c.allergens !== undefined && !c.allergens.every((x) => (ALERGENS as readonly string[]).includes(x))) throw new Error("Al·lèrgen no vàlid");
  return c.name !== undefined ? { ...c, name: c.name.trim() } : c;
}

export async function actualitzaPlat(slug: string, canvis: Partial<CanvisPlat>) {
  const supabase = await client();
  const net = validaPlat(canvis);
  // Arxivar treu el plat de la venda; recuperar-lo no el torna a posar a la venda sol.
  const extra = canvis.archived ? { available: false } : {};
  comprova((await supabase.from("dishes").update({ ...net, ...extra, updated_at: new Date().toISOString() }).eq("slug", slug)).error);
  revalidatePath("/panel", "layout");
  revalidatePath("/", "layout");
}

const slugDe = (nom: string) =>
  nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/l·l/g, "ll")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "plat";

/** Plat nou: comença fora de la venda perquè l'amo el pugui acabar d'omplir abans que surti a la web. */
export async function creaPlat(nom: string, seccio: Seccio): Promise<string> {
  const supabase = await client();
  const { name } = validaPlat({ name: nom, section: seccio }) as { name: string };
  const { data: existents } = await supabase.from("dishes").select("slug, sort");
  const slugs = new Set((existents ?? []).map((d) => d.slug as string));
  const base = slugDe(name);
  let slug = base;
  for (let i = 2; slugs.has(slug); i++) slug = `${base}-${i}`;
  const sort = Math.max(0, ...(existents ?? []).map((d) => d.sort as number)) + 1;
  comprova(
    (
      await supabase.from("dishes").insert({
        slug,
        name,
        section: seccio,
        price_cents: 0,
        available: false,
        que_queda_ok: seccio === "casa",
        sort,
      })
    ).error,
  );
  revalidatePath("/panel", "layout");
  return slug;
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
