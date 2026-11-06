import "server-only";
import { CONTROL_SHARE } from "@/lib/sim/config";
import { serviceClient, totes } from "@/lib/sim/db";
import { Rng } from "@/lib/sim/rng";
import { enviaCorreu } from "@/lib/correu/correu";
import { origen } from "@/lib/origen";
import { avisaWallet, teWallet } from "@/lib/wallet/avisa";
import { carnet } from "@/lib/wallet/carnet";

// Enviaments reals: només a clients reals (simulated = false) amb consentiment comercial i sense baixa.
// L'amo ja ha aprovat el missatge; els números (qui el rep) els decideix SQL, no la IA.

type Idioma = "ca" | "es" | "en";

interface ClientReal {
  id: string;
  first_name: string;
  email: string | null;
  locale: Idioma;
}

const ASSUMPTES: Record<string, Record<Idioma, string>> = {
  recuperacio: { ca: "Fa dies que no et veiem", es: "Hace días que no te vemos", en: "We haven't seen you in a while" },
  franja: { ca: "Segell doble al carnet", es: "Sello doble en el carnet", en: "Double stamp on your card" },
  padro: { ca: "Novetats al padró d'ingredients", es: "Novedades en el padrón de ingredientes", en: "News from the ingredient register" },
  calendari: { ca: "Aquesta setmana, a La Carmanyola", es: "Esta semana, en La Carmanyola", en: "This week at La Carmanyola" },
  quequeda: { ca: "L'hora del Què Queda", es: "La hora del Què Queda", en: "Què Queda hour" },
};

/** Clients reals que han acceptat els avisos. `recuperacio`: només els que fa 21 dies o més que no demanen. */
async function destinataris(tipus: string): Promise<ClientReal[]> {
  const db = serviceClient();
  const clients = await totes<ClientReal & { created_at: string }>((a, b) =>
    db.from("customers").select("id, first_name, email, locale, created_at").eq("simulated", false).eq("consent_email", true).is("unsubscribed_at", null).order("id").range(a, b),
  );
  if (tipus !== "recuperacio" || !clients.length) return clients;
  const fa21 = Date.now() - 21 * 86_400_000;
  const { data: ultimes } = await db.from("comandes_valides").select("customer_id, created_at").in("customer_id", clients.map((c) => c.id)).order("created_at", { ascending: false });
  const ultima = new Map<string, number>();
  for (const o of ultimes ?? []) if (!ultima.has(o.customer_id)) ultima.set(o.customer_id, new Date(o.created_at).getTime());
  return clients.filter((c) => (ultima.get(c.id) ?? new Date(c.created_at).getTime()) < fa21);
}

/** Resend (pla gratuït) accepta 2 correus per segon. */
const pausa = () => new Promise((r) => setTimeout(r, 600));

const omple = (plantilla: string, v: Record<string, string>) => plantilla.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

/** Envia una campanya aprovada. Idempotent: qui ja hi és com a destinatari no la torna a rebre. */
export async function enviaCampanya(slug: string) {
  const db = serviceClient();
  const { data: c } = await db.from("campaigns").select("id, kind, status, messages, channel_wallet, channel_email, simulated").eq("slug", slug).single();
  if (!c || c.status !== "aprovada" || c.simulated) return { enviats: 0 };

  const { data: ja } = await db.from("campaign_recipients").select("customer_id").eq("campaign_id", c.id);
  const fets = new Set((ja ?? []).map((r) => r.customer_id));
  const o = await origen();
  const ara = new Date().toISOString();
  let enviats = 0;

  for (const client of await destinataris(c.kind)) {
    if (fets.has(client.id)) continue;
    // Grup de control determinista, com al simulador: 1 de cada 4 no rep l'avís.
    const control = new Rng(`carmanyola:control:${slug}:${client.id}`).bool(CONTROL_SHARE);
    const canals: string[] = [];
    let error: string | null = null;
    if (!control) {
      const carn = await carnet(client.id);
      const missatges = (c.messages?.original ?? {}) as Partial<Record<Idioma, string>>;
      const text = omple(missatges[client.locale] || missatges.ca || "", { nom: client.first_name, paraula: carn?.falta?.split(" → ")[1] ?? "" });
      if (!text) continue;
      if (c.channel_email && client.email) {
        const r = await enviaCorreu({ a: client.email, assumpte: ASSUMPTES[c.kind]?.[client.locale] ?? "La Carmanyola", titol: ASSUMPTES[c.kind]?.[client.locale] ?? "La Carmanyola", cos: text, locale: client.locale, origen: o, clientId: client.id });
        if (r.enviat) canals.push("correu");
        else error = r.error ?? null;
        await pausa();
      }
      if (c.channel_wallet && (await teWallet(client.id))) {
        await avisaWallet(client.id, { titol: "La Carmanyola", text });
        canals.push("wallet");
      }
      if (canals.length) enviats++;
    }
    await db.from("campaign_recipients").upsert({ campaign_id: c.id, customer_id: client.id, control, sent_at: ara, channels: canals, error }, { onConflict: "campaign_id,customer_id", ignoreDuplicates: true });
  }

  await db.from("campaigns").update({ status: "enviada", sent_at: ara }).eq("id", c.id).eq("status", "aprovada");
  return { enviats };
}

/** L'avís del Què Queda: a tots els clients amb carnet i consentiment. Una vegada per servei. */
export async function enviaQueQueda(dia: string, servei: "migdia" | "vespre") {
  const db = serviceClient();
  const { data: avis } = await db.from("que_queda_alerts").select("message, sent_at").match({ day: dia, service: servei }).maybeSingle();
  if (!avis || avis.sent_at || !avis.message) return { enviats: 0 };
  // Es marca abans d'enviar: si l'amo l'activa dues vegades, només surt una.
  const { data: marcat } = await db.from("que_queda_alerts").update({ sent_at: new Date().toISOString() }).match({ day: dia, service: servei }).is("sent_at", null).select("day");
  if (!marcat?.length) return { enviats: 0 };

  const o = await origen();
  let enviats = 0;
  for (const client of await destinataris("quequeda")) {
    const assumpte = ASSUMPTES.quequeda[client.locale];
    let arriba = false;
    if (client.email) arriba = (await enviaCorreu({ a: client.email, assumpte, titol: assumpte, cos: `${avis.message}\n\n${o}/carta`, locale: client.locale, origen: o, clientId: client.id })).enviat;
    if (client.email) await pausa();
    if (await teWallet(client.id)) {
      await avisaWallet(client.id, { titol: assumpte, text: avis.message });
      arriba = true;
    }
    if (arriba) enviats++;
  }
  await db.from("que_queda_alerts").update({ recipients: enviats }).match({ day: dia, service: servei });
  return { enviats };
}

/** Baixa amb un clic: fora el consentiment comercial (es manté la data de la baixa). */
export async function donaDeBaixa(clientId: string) {
  const { error } = await serviceClient()
    .from("customers")
    .update({ consent_email: false, unsubscribed_at: new Date().toISOString(), wallet_message: null })
    .eq("id", clientId)
    .eq("simulated", false);
  if (error) throw new Error(error.message);
}
