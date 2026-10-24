import "server-only";
import { cache } from "react";
import { supabaseServidor } from "@/lib/supabase/server";
import { deDiaIso, deMes, diaComplet, diaMes, diesCurts, diesSetmana, hora, local, majuscula, mesos, properDia } from "@/lib/dates";
import type { Campanya, EstatCampanya, To } from "@/lib/data/campanyes";
import type { Idioma, Plat } from "@/lib/data/carta";
import type { Client, Segment } from "@/lib/data/clients";
import type { AvisPadro, Estacio, EstatPadro, Ingredient } from "@/lib/data/padro";
import type { SeccioVeu } from "@/lib/data/veu";
import type { DadesVendes, Periode } from "@/lib/data/vendes";
import { euros, percent } from "@/lib/format";
import * as ia from "@/lib/ia/plantilles";

/* Tot el que hi ha aquí llegeix amb la sessió de l'amo; els càlculs pesats són funcions SQL (panel_*). */

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

async function taula<T>(q: (s: Awaited<ReturnType<typeof supabaseServidor>>) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const supabase = await supabaseServidor();
  const { data, error } = await q(supabase);
  if (error) throw new Error(error.message);
  return data as T;
}

/** "del 5" / "de l'11" i "al 5" / "a l'11" */
const de = (n: number) => (n === 1 || n === 11 ? `de l'${n}` : `del ${n}`);
const a = (n: number) => (n === 1 || n === 11 ? `a l'${n}` : `al ${n}`);
const plural = (dow: number) => (dow === 6 ? "dissabtes" : diesSetmana[dow % 7]);

/* ---------------------------------------------------------------------------
 * Vendes
 * ------------------------------------------------------------------------- */

interface VendesRpc {
  des_de: string;
  fins_a: string;
  actual: Totals | null;
  anterior: Totals | null;
  buckets: { k: string; actual: number; anterior: number }[];
  plats: { nom: string; unitats: number; ingressos: number; anteriors: number }[];
  altres: number;
}
interface Totals {
  ingressos: number;
  comandes: number;
  dinar: number;
  directe: number;
  plataformes: number;
}

const zero: Totals = { ingressos: 0, comandes: 0, dinar: 0, directe: 0, plataformes: 0 };

export const vendes = cache(async (periode: Periode): Promise<DadesVendes> => {
  const r = await rpc<VendesRpc>("panel_vendes", { p_periode: periode });
  const c = r.actual ?? zero;
  const p = r.anterior ?? zero;
  const ara = new Date();
  const desDe = new Date(r.des_de);
  const finsA = new Date(new Date(r.fins_a).getTime() - 86400000);
  const ld = local(desDe);
  const lf = local(finsA);

  const subtitol =
    periode === "avui"
      ? `${majuscula(diaComplet(ara))}, fins a les ${hora(ara)} · comparat amb ${diesSetmana[local(ara).diaSetmana]} passat`
      : periode === "setmana"
        ? `Setmana ${de(ld.dia)}${ld.mes !== lf.mes ? ` ${deMes(ld.mes)}` : ""} ${a(lf.dia)} ${deMes(lf.mes)} · comparada amb l'anterior`
        : `${majuscula(de(ld.dia))} ${deMes(ld.mes)} ${a(lf.dia)} ${deMes(lf.mes)} · comparat amb les 4 setmanes anteriors`;

  const etiqueta = (k: string) => {
    if (periode === "avui") return k;
    if (periode === "setmana") return diesCurts[Number(k) % 7];
    const d = new Date(desDe.getTime() + Number(k) * 7 * 86400000);
    const l = local(d);
    return `${l.dia} ${mesos[l.mes].slice(0, 3)}`;
  };

  const dades: DadesVendes = {
    subtitol,
    ingressos: c.ingressos,
    ingressosAnteriors: p.ingressos,
    comandes: c.comandes,
    comandesAnteriors: p.comandes,
    tiquetMitja: c.comandes ? Math.round(c.ingressos / c.comandes) : 0,
    tiquetMitjaAnterior: p.comandes ? Math.round(p.ingressos / p.comandes) : 0,
    ambDinar: c.comandes ? c.dinar / c.comandes : 0,
    comandesDinar: c.dinar,
    extraDinar: c.dinar * 200,
    titolGrafic: periode === "avui" ? "Ingressos per franja" : periode === "setmana" ? "Ingressos per dia" : "Ingressos per setmana",
    perDia: r.buckets.map((b) => ({ etiqueta: etiqueta(b.k), actual: b.actual, anterior: b.anterior })),
    canal: { web: c.directe, plataformes: c.plataformes, comissions: Math.round(c.plataformes * 0.3) },
    plats: (r.plats ?? []).map((x) => ({
      nom: x.nom,
      unitats: x.unitats,
      ingressos: x.ingressos,
      variacio: x.anteriors ? x.ingressos / x.anteriors - 1 : 0,
    })),
    altres: { dinar: c.dinar * 200, acompanyamentsBegudes: r.altres ?? 0 },
    ia: { titol: "", punts: [] },
  };
  dades.ia = ia.vendes(periode, dades, p.comandes ? p.dinar / p.comandes : 0);
  return dades;
});

/* ---------------------------------------------------------------------------
 * Franges
 * ------------------------------------------------------------------------- */

interface FrangesRpc {
  mitjanes: { dow: number; slot: string; n: number }[];
  fluixes: { dow: number; slot: string }[] | null;
  mitjana_fluixes: number | null;
  mitjana_migdia: number | null;
  previsio: { dow: number; base: number; extra: number }[] | null;
  prova: { enviada: string; durant: number; abans: number } | null;
}

export const FRANGES = ["12-13", "13-14", "14-15", "15-16", "19-20", "20-21", "21-22", "22-23"] as const;
export const DIES = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds"] as const;

export const franges = cache(async () => {
  const r = await rpc<FrangesRpc>("panel_franges");
  const matriu = DIES.map((_, d) => FRANGES.map((f) => Math.round(r.mitjanes.find((m) => m.dow === d + 1 && m.slot === f)?.n ?? 0)));
  const fluixes = (r.fluixes ?? []).map((x) => [x.dow - 1, FRANGES.indexOf(x.slot as (typeof FRANGES)[number])] as [number, number]);
  const previsio = DIES.map((dia, i) => {
    const p = r.previsio?.find((x) => x.dow === i + 1);
    return { dia, base: p?.base ?? 0, extra: p?.extra ?? 0 };
  });
  const prova = r.prova && r.prova.abans ? r.prova.durant / r.prova.abans - 1 : null;
  return {
    matriu,
    fluixes,
    previsio,
    mitjanaFluixes: Math.round(r.mitjana_fluixes ?? 0),
    mitjanaMigdia: Math.round(r.mitjana_migdia ?? 0),
    prova,
    proposta: ia.franges(r.fluixes ?? [], Math.round(r.mitjana_fluixes ?? 0), Math.round(r.mitjana_migdia ?? 0), prova),
  };
});

/* ---------------------------------------------------------------------------
 * Clients
 * ------------------------------------------------------------------------- */

interface ClientRpc {
  id: string;
  first_name: string;
  last_name: string;
  gender: "f" | "m" | "x";
  created_at: string;
  wallet: boolean;
  consent_email: boolean;
  comandes: number;
  ultima: string | null;
  laborables: number | null;
  tarda: number | null;
  despesa_90: number | null;
  interval_dies: number | null;
  sense_venir: number;
  segells: number;
  complets: number;
  paraules: number;
  preferit: string | null;
  li_falta: string | null;
  risc: number;
  en_risc: boolean;
  nou: boolean;
  mestre: boolean;
  adormit: boolean;
}

export interface ClientPanell extends Client {
  laborables: number;
  tarda: number;
  despesa90: number;
  wallet: boolean;
  consentiment: boolean;
}

function nivell(complets: number, g: "f" | "m" | "x") {
  if (complets >= 3) return "Mestre";
  if (complets >= 1) return g === "f" ? "Desbowlitzadora" : "Desbowlitzador";
  return "Aprenent";
}

function venia(interval: number | null) {
  if (!interval) return "—";
  const setmana = 7 / interval;
  return setmana >= 1 ? `${Math.round(setmana)}/setmana` : `${Math.max(1, Math.round(30 / interval))}/mes`;
}

export const clients = cache(async () => {
  const r = await rpc<{ total_comandes_90: number; clients: ClientRpc[] | null }>("panel_clients");
  const ara = Date.now();
  const llista: ClientPanell[] = (r.clients ?? []).map((c) => ({
    id: c.id,
    nom: `${c.first_name} ${c.last_name.charAt(0)}.`,
    nivell: nivell(c.complets, c.gender),
    venia: venia(c.interval_dies),
    senseVenir: c.sense_venir,
    paraules: c.paraules,
    platPreferit: c.preferit ?? "—",
    risc: c.risc,
    comandes: c.comandes,
    mesos: Math.floor((ara - new Date(c.created_at).getTime()) / (30.4 * 86400000)),
    ultima: c.ultima ? diaMes(c.ultima) : "—",
    liFalta: c.li_falta ?? "—",
    avisos: c.wallet && c.consent_email ? "carnet-correu" : c.wallet ? "carnet" : "correu",
    segments: [
      "tots",
      ...(c.en_risc ? (["risc"] as const) : []),
      ...(c.nou ? (["nous"] as const) : []),
      ...(c.mestre ? (["mestres"] as const) : []),
      ...(c.adormit ? (["adormits"] as const) : []),
    ],
    laborables: c.laborables ?? 0,
    tarda: c.tarda ?? 0,
    despesa90: c.despesa_90 ?? 0,
    wallet: c.wallet,
    consentiment: c.consent_email,
  }));
  const segments: Segment[] = ["tots", "risc", "nous", "mestres", "adormits"];
  const recompte = Object.fromEntries(segments.map((s) => [s, llista.filter((c) => c.segments.includes(s)).length])) as Record<Segment, number>;
  return { llista, recompte, totalComandes90: r.total_comandes_90, ia: ia.clients(llista, r.total_comandes_90) };
});

/* ---------------------------------------------------------------------------
 * Què Queda
 * ------------------------------------------------------------------------- */

interface QueQuedaRpc {
  servei: "migdia" | "vespre";
  ara: string;
  hora_qq: string;
  temps: { pluja: number; max: number | null } | null;
  avis: { missatge: string; activat: string } | null;
  plats: { id: number; nom: string; fets: number; venuts: number; previsio: number; inclos: boolean | null }[] | null;
  encert: number | null;
  dema: string;
  temps_dema: { pluja: number; max: number | null } | null;
  produccio: { id: number; name: string; abans: number; proposat: number; sobra: number; esgota: number; estat: string | null }[] | null;
}

const temps = (t: { pluja: number; max: number | null } | null) =>
  t ? `${Number(t.pluja) >= 1 ? "Pluja" : "Sense pluja"}${t.max != null ? ` · ${Math.round(Number(t.max))} °C` : ""}` : "Sense dades del temps";

export const queQueda = cache(async () => {
  const [r, cl] = await Promise.all([rpc<QueQuedaRpc>("panel_que_queda"), clients()]);
  const ara = new Date(r.ara);
  const dema = deDiaIso(r.dema);
  const dowDema = local(dema).diaSetmana;
  const pluja = r.temps_dema && Number(r.temps_dema.pluja) >= 1;
  const mestres = cl.llista.filter((c) => c.segments.includes("mestres")).length;

  return {
    ara: {
      subtitol: `${majuscula(diaComplet(ara))} · servei de ${r.servei} · ara són les ${hora(ara)}`,
      temps: temps(r.temps),
      hora: r.hora_qq,
    },
    servei: r.servei,
    plats: (r.plats ?? []).map((p) => ({ id: p.id, nom: p.nom, fets: p.fets, venuts: p.venuts, previsio: p.previsio, inclos: p.inclos })),
    avis: r.avis,
    proposta: { mestres, encert: r.encert ?? 0 },
    produccio: {
      dema: r.dema,
      titol: `Producció del matí de ${diesSetmana[dowDema]}`,
      estat: r.produccio?.find((x) => x.estat)?.estat ?? null,
      items: (r.produccio ?? []).map((x) => ({
        id: x.id,
        nom: x.name,
        abans: x.abans,
        despres: x.proposat,
        motiu:
          x.proposat < x.abans && x.sobra > 0
            ? `En sobren ${x.sobra} ${plural(dowDema)} de cada 6`
            : x.proposat > x.abans && x.esgota > 0
              ? `S'esgota ${x.esgota} ${plural(dowDema)} de cada 6`
              : pluja
                ? "Demà plou: hi comptem"
                : `Mitjana dels últims 4 ${plural(dowDema)}`,
      })),
    },
  };
});

/* ---------------------------------------------------------------------------
 * Campanyes
 * ------------------------------------------------------------------------- */

interface CampanyaRpc {
  id: string;
  slug: string;
  kind: Campanya["tipus"];
  segment: string | null;
  title: string;
  chips: string[];
  reasons: string[];
  messages: Campanya["missatges"];
  simpler_label: string | null;
  channel_wallet: boolean;
  channel_email: boolean;
  schedule_text: string | null;
  schedule_reason: string | null;
  preview_date: string | null;
  preview_time: string | null;
  status: EstatCampanya | "ara-no";
  saved_at: string | null;
  sent_at: string | null;
  proposed_label: string | null;
  created_at: string | null;
  resultat: { clients: number; control_n: number; tornat: number | null; control: number | null } | null;
}

const omple = (t: string, vars: Record<string, string | number>) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? "—"));

export const campanyes = cache(async () => {
  const [files, cl, fr, peticions] = await Promise.all([
    rpc<CampanyaRpc[] | null>("panel_campanyes"),
    clients(),
    franges(),
    taula<{ id: number; goal: string }[]>((s) => s.from("campaign_requests").select("id, goal").order("created_at")),
  ]);
  // Per revisar primer (la més recent dalt), després les enviades de la més nova a la més antiga.
  const llista = [...(files ?? [])].sort((x, y) =>
    !!x.sent_at !== !!y.sent_at
      ? x.sent_at ? 1 : -1
      : x.sent_at && y.sent_at
        ? y.sent_at.localeCompare(x.sent_at)
        : (y.created_at ?? "").localeCompare(x.created_at ?? "") || x.slug.localeCompare(y.slug),
  );
  const enviades = llista.filter((c) => c.sent_at);
  const darrera = (kind: string) => enviades.find((c) => c.kind === kind)?.resultat;

  const risc = cl.llista.filter((c) => c.segments.includes("risc"));
  const rec = darrera("recuperacio");
  const bolets = enviades.find((c) => c.slug === "bolets")?.resultat;
  const despesaRisc = risc.reduce((s, c) => s + c.despesa90, 0);
  const totalCarnet = cl.llista.reduce((s, c) => s + c.comandes, 0);
  const vars: Record<string, string | number> = {
    n: risc.length,
    a_mig: risc.filter((c) => 8 - c.paraules <= 3).length,
    pct_clients: percent(cl.llista.length ? risc.length / cl.llista.length : 0),
    pct_comandes: percent(totalCarnet ? risc.reduce((s, c) => s + c.comandes, 0) / totalCarnet : 0),
    cost: euros(Math.round(despesaRisc / 3 / 1000) * 1000, { senseDecimals: true }),
    tornat: percent(rec?.tornat ?? 0),
    control: percent(rec?.control ?? 0),
    fluixes: fr.mitjanaFluixes,
    migdia: fr.mitjanaMigdia,
    prova: fr.prova == null ? "encara sense dades" : percent(fr.prova, { signe: true }),
    bolets_n: bolets?.clients ?? 0,
    bolets_tornat: percent(bolets?.tornat ?? 0),
  };
  const destinataris = (segment: string | null) =>
    segment === "risc" ? risc : segment === "bolets" ? [] : cl.llista.filter((c) => c.wallet);

  const resultat: Campanya[] = llista.map((c) => {
    const dest = destinataris(c.segment);
    const previDia = c.preview_date?.length === 1 ? properDia(Number(c.preview_date)) : c.preview_date ? deDiaIso(c.preview_date) : null;
    return {
      id: c.slug,
      tipus: c.kind,
      titol: omple(c.title, vars),
      estat: c.status === "ara-no" ? "descartada" : c.status,
      proposada: c.proposed_label ?? "",
      xips: c.chips.map((x) => omple(x, vars)),
      perQue: c.reasons.map((x) => omple(x, vars)),
      missatges: c.messages,
      senseExtra: c.simpler_label ?? undefined,
      canals: {
        wallet: c.channel_wallet,
        correu: c.channel_email,
        correuAcceptat: c.segment === "bolets" ? Math.round((bolets?.clients ?? 0) * 0.6) : dest.filter((d) => d.consentiment).length,
      },
      quan: { text: c.schedule_text ?? "", motiu: c.schedule_reason ?? "" },
      previsualitzacio: { data: previDia ? diaComplet(previDia) : "", hora: c.preview_time ?? "" },
      resultat: c.resultat && c.sent_at ? { clients: c.resultat.clients, tornat: c.resultat.tornat ?? 0, control: c.resultat.control ?? 0 } : undefined,
    };
  });

  return { campanyes: resultat, peticions: peticions ?? [] };
});

/* ---------------------------------------------------------------------------
 * Padró
 * ------------------------------------------------------------------------- */

export const padro = cache(async () => {
  const [ings, alertes] = await Promise.all([
    taula<
      {
        id: number;
        slug: string;
        name: string;
        comarca: string | null;
        season: Estacio;
        status: EstatPadro;
        alta_on: string | null;
        baixa_on: string | null;
        alta_label: string | null;
        baixa_label: string | null;
        dish_ingredients: { dishes: { name: string } | null }[];
      }[]
    >((s) =>
      s
        .from("ingredients")
        .select("id, slug, name, comarca, season, status, alta_on, baixa_on, alta_label, baixa_label, dish_ingredients(dishes(name))")
        .order("id"),
    ),
    taula<{ id: string; kind: "alta" | "baixa"; title: string; reasons: string[]; announcement: string; campaign_slug: string | null; status: string; ingredients: { slug: string } | null }[]>(
      (s) => s.from("ingredient_alerts").select("id, kind, title, reasons, announcement, campaign_slug, status, ingredients(slug)").order("id"),
    ),
  ]);

  const ingredients: Ingredient[] = (ings ?? []).map((i) => ({
    id: i.slug,
    nom: i.name,
    comarca: i.comarca,
    estacio: i.season,
    estat: i.status,
    alta: i.alta_on ? diaMes(deDiaIso(i.alta_on)) : i.alta_label,
    baixa: i.baixa_on ? diaMes(deDiaIso(i.baixa_on)) : i.baixa_label,
    plats: i.dish_ingredients.map((d) => d.dishes?.name).filter(Boolean) as string[],
  }));
  const avisos: (AvisPadro & { estat: string })[] = (alertes ?? []).map((a) => ({
    id: a.id,
    ingredient: a.ingredients?.slug ?? "",
    tipus: a.kind,
    titol: a.title,
    punts: a.reasons,
    anunci: a.announcement,
    campanya: a.campaign_slug ?? undefined,
    estat: a.status,
  }));
  return { ingredients, avisos };
});

/* ---------------------------------------------------------------------------
 * Carta, veu i carnet
 * ------------------------------------------------------------------------- */

export const carta = cache(async (): Promise<Plat[]> => {
  const files = await taula<
    {
      slug: string;
      name: string;
      section: Plat["seccio"];
      price_cents: number;
      season: Plat["temporada"];
      tags: string[];
      allergens: string[];
      que_queda_ok: boolean;
      available: boolean;
      description: Record<Idioma, string>;
      supplement: { name: string; price_cents: number } | null;
    }[]
  >((s) => s.from("dishes").select("slug, name, section, price_cents, season, tags, allergens, que_queda_ok, available, description, supplement").order("sort"));
  return (files ?? []).map((d) => ({
    slug: d.slug,
    nom: d.name,
    seccio: d.section,
    preu: d.price_cents,
    temporada: d.season,
    etiquetes: d.tags,
    alergens: d.allergens,
    queQuedaOk: d.que_queda_ok,
    disponible: d.available,
    descripcio: d.description,
    suplement: d.supplement ? { nom: d.supplement.name, preu: d.supplement.price_cents } : undefined,
  }));
});

export const veu = cache(async (): Promise<SeccioVeu[]> => {
  const files = await taula<{ id: string; title: string; body: string }[]>((s) => s.from("brand_voice").select("id, title, body").order("sort"));
  return (files ?? []).map((f) => ({ id: f.id, titol: f.title, text: f.body }));
});

export const carnet = cache(async () =>
  rpc<{
    total: number;
    aprenents: number;
    desbowlitzadors: number;
    mestres: number;
    paraules_setmana: number;
    complets_setmana: number;
    directes: number | null;
  }>("panel_carnet"),
);

/* ---------------------------------------------------------------------------
 * Propostes pendents (comptadors del menú i estat inicial del panell)
 * ------------------------------------------------------------------------- */

export type ResolucioDb = "aprovada" | "descartada" | "esborrany" | "ara-no";

export const resolucions = cache(async (): Promise<Record<string, ResolucioDb>> => {
  const supabase = await supabaseServidor();
  const avui = (() => {
    const l = local(new Date());
    return `${l.any}-${String(l.mes + 1).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`;
  })();
  const [camps, alertes, avisos, qq] = await Promise.all([
    supabase.from("campaigns").select("slug, status, saved_at").is("sent_at", null),
    supabase.from("ingredient_alerts").select("id, status"),
    supabase.from("que_queda_alerts").select("day").eq("day", avui),
    queQueda(),
  ]);
  const out: Record<string, ResolucioDb> = {};
  for (const c of camps.data ?? []) {
    if (c.status === "esborrany" && c.saved_at) out[`campanya:${c.slug}`] = "esborrany";
    else if (c.status !== "esborrany") out[`campanya:${c.slug}`] = c.status as ResolucioDb;
  }
  for (const a of alertes.data ?? []) if (a.status !== "proposada") out[`padro:${a.id}`] = a.status as ResolucioDb;
  if ((avisos.data ?? []).length) out["quequeda:avis"] = "aprovada";
  if (qq.produccio.estat) out["vendes:produccio"] = qq.produccio.estat === "enviat" ? "aprovada" : "ara-no";
  return out;
});

export type { To };
