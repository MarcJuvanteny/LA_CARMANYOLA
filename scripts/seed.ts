/**
 * Seed de La Carmanyola (CONTEXT.md §10).
 *
 *   npm run db:seed
 *
 * 1. Dades fixes: carta, padró, paraules, veu de marca, festius i campanyes.
 * 2. Temps real de Barcelona (Open-Meteo) dels últims 6 mesos i la previsió.
 * 3. ~400 clients simulats amb perfil (Faker, noms catalans).
 * 4. Sis mesos de comandes generades pel mateix motor SQL que fa anar el restaurant viu.
 *    Les campanyes enviades trien els destinataris el dia que s'envien.
 * 5. L'usuari amo del panell i el fitxer .env.local amb les claus públiques.
 *
 * Només per a la base de dades LOCAL.
 */

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { plats } from "../src/lib/data/carta";
import { campanyes } from "../src/lib/data/campanyes";
import { veuInicial } from "../src/lib/data/veu";
import { deMes, diaMes, local } from "../src/lib/dates";

const DIES_HISTORIA = 183;
const AMO = { email: "amo@lacarmanyola.local", password: "carmanyola-local" };

// ---------------------------------------------------------------------------
// Connexió (claus de `supabase status`)
// ---------------------------------------------------------------------------

function supabaseBin() {
  const local = join(homedir(), ".local/bin/supabase");
  return existsSync(local) ? local : "supabase";
}

const env = Object.fromEntries(
  execFileSync(supabaseBin(), ["status", "-o", "env"], { encoding: "utf8" })
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);

if (!env.DB_URL?.includes("127.0.0.1")) {
  throw new Error("El seed només es pot executar contra la base de dades local.");
}

const sql = postgres(env.DB_URL, { onnotice: () => {} });
faker.seed(1714);

const ara = new Date();
const dia = (offset: number) => {
  const d = new Date(ara.getTime() + offset * 86400000);
  const l = local(d);
  return `${l.any}-${String(l.mes + 1).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`;
};
const obertura = dia(-DIES_HISTORIA);

/** Dilluns igual o anterior a una data ISO. */
function dillunsAbans(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}

/** Moment local de Barcelona (aprox. horari d'estiu/hivern resolt per Postgres). */
const momentLocal = async (iso: string, hhmm: string) =>
  (await sql`select (${iso}::date + ${hhmm}::time) at time zone 'Europe/Madrid' as t`)[0].t as Date;

// ---------------------------------------------------------------------------
// 1. Dades fixes
// ---------------------------------------------------------------------------

async function netejar() {
  await sql`select cron.unschedule('restaurant-viu')`.catch(() => {});
  await sql`
    truncate public.campaign_recipients, public.campaigns, public.campaign_requests, public.stamps, public.rewards,
      public.order_items, public.orders, public.sim_profiles, public.customers, public.leftovers, public.que_queda_alerts,
      public.production_plans, public.ingredient_alerts, public.dish_ingredients, public.ingredients, public.build_options,
      public.dishes, public.words, public.brand_voice, public.weather_daily, public.holidays, public.sim_config
    restart identity cascade`;
}

async function dadesFixes() {
  for (const [i, p] of plats.entries()) {
    await sql`
      insert into public.dishes (slug, name, section, price_cents, description, allergens, season, tags, supplement, que_queda_ok, available, sort)
      values (${p.slug}, ${p.nom}, ${p.seccio}, ${p.preu}, ${sql.json(p.descripcio)}, ${p.alergens}, ${p.temporada}, ${p.etiquetes},
        ${p.suplement ? sql.json({ name: p.suplement.nom, price_cents: p.suplement.preu }) : null}, ${p.queQuedaOk}, true, ${i})`;
  }

  // Diccionari: 4 paraules conegudes; les altres 4 estan pendents (no les inventem).
  const paraules: [number, string | null, string | null][] = [
    [1, "bowl", "carmanyola"],
    [2, "topping", "picada"],
    [3, "takeaway", "per emportar"],
    [4, "brunch", "esmorzar de forquilla"],
    [5, null, null],
    [6, null, null],
    [7, null, null],
    [8, null, null],
  ];
  for (const [id, from, to] of paraules) {
    await sql`insert into public.words (id, from_word, to_word) values (${id}, ${from}, ${to})`;
  }

  const ingredients = [
    { slug: "bolets", name: "Bolets", comarca: "Solsonès", season: "tardor", status: "empadronat", alta: dia(-12), baixa: null, baixaLabel: "desembre", plats: ["fricando-amb-bolets"] },
    { slug: "castanyes", name: "Castanyes", comarca: "Montseny", season: "tardor", status: "empadronat", alta: dia(-8), baixa: null, baixaLabel: "desembre", plats: ["la-castanyera"] },
    { slug: "moniato", name: "Moniato", comarca: "Baix Llobregat", season: "tardor", status: "empadronat", alta: dia(-16), baixa: null, baixaLabel: "gener", plats: ["la-castanyera"] },
    { slug: "codony", name: "Codony", comarca: "Segrià", season: "tardor", status: "empadronat", alta: dia(-13), baixa: null, baixaLabel: "desembre", plats: ["fes-te-l-tu"] },
    { slug: "carxofa", name: "Carxofa del Prat", comarca: "Baix Llobregat", season: "hivern", status: "alta-proposada", alta: dia(26), baixa: null, baixaLabel: "abril", plats: ["fes-te-l-tu"] },
    { slug: "tomaquet", name: "Tomàquet", comarca: null, season: "estiu", status: "baixa-proposada", alta: null, altaLabel: "juny", baixa: dia(1), plats: ["l-esqueixat"] },
    { slug: "calcots", name: "Calçots", comarca: "Alt Camp", season: "hivern", status: "ve-aviat", alta: null, altaLabel: "gener", baixa: null, baixaLabel: "abril", plats: [] },
    { slug: "pesols", name: "Pèsols", comarca: null, season: "primavera", status: "de-baixa", alta: null, baixa: null, plats: [] },
    { slug: "faves", name: "Faves", comarca: null, season: "primavera", status: "de-baixa", alta: null, baixa: null, plats: [] },
  ];
  for (const ing of ingredients) {
    const [{ id }] = await sql`
      insert into public.ingredients (slug, name, comarca, season, status, alta_on, baixa_on, alta_label, baixa_label)
      values (${ing.slug}, ${ing.name}, ${ing.comarca}, ${ing.season}, ${ing.status}, ${ing.alta}, ${ing.baixa},
        ${"altaLabel" in ing ? ing.altaLabel ?? null : null}, ${"baixaLabel" in ing ? ing.baixaLabel ?? null : null})
      returning id`;
    for (const slug of ing.plats) {
      await sql`insert into public.dish_ingredients (dish_id, ingredient_id) select id, ${id} from public.dishes where slug = ${slug}`;
    }
  }

  const carxofaAlta = new Date(`${dia(26)}T12:00:00Z`);
  await sql`
    insert into public.ingredient_alerts (id, ingredient_id, kind, title, reasons, announcement, campaign_slug)
    select 'alta-carxofa', id, 'alta', 'La carxofa del Prat demana l''empadronament',
      ${[
        `Al calendari de temporada, la carxofa del Prat entra el **${diaMes(carxofaAlta)}**.`,
        "Pot entrar al Fes-te'l tu com a guarnició sense tocar cap plat de la casa.",
        "Ja tens preparada la campanya per als qui van rebre l'avís dels bolets.",
      ]},
      ${`Nova veïna al padró: la carxofa del Prat s'empadrona a La Carmanyola a partir del ${diaMes(carxofaAlta)}. Ve del Baix Llobregat i es quedarà fins a la primavera.`},
      'carxofa'
    from public.ingredients where slug = 'carxofa'`;
  await sql`
    insert into public.ingredient_alerts (id, ingredient_id, kind, title, reasons, announcement)
    select 'baixa-tomaquet', id, 'baixa', 'El tomàquet es dona de baixa',
      ${[
        `La temporada de proximitat s'acaba el **${diaMes(new Date(`${dia(1)}T12:00:00Z`))}**.`,
        "Només afecta L'Esqueixat, que ja baixa per l'arribada de la tardor.",
        "No cal avisar ningú per campanya: n'hi ha prou amb l'anunci a la web.",
      ]},
      'El tomàquet es dona de baixa del padró fins a l''estiu. Gràcies per tots els serveis, veí.'
    from public.ingredients where slug = 'tomaquet'`;

  for (const [i, s] of veuInicial.entries()) {
    await sql`insert into public.brand_voice (id, title, body, sort) values (${s.id}, ${s.titol}, ${s.text}, ${i})`;
  }

  // Festius de Barcelona 2026 (calendari oficial; font: Open Data BCN)
  const festius: [string, string][] = [
    ["2026-01-01", "Cap d'Any"], ["2026-01-06", "Reis"], ["2026-04-03", "Divendres Sant"], ["2026-04-06", "Dilluns de Pasqua"],
    ["2026-05-01", "Festa del Treball"], ["2026-05-25", "Segona Pasqua"], ["2026-06-24", "Sant Joan"], ["2026-08-15", "L'Assumpció"],
    ["2026-09-11", "Diada"], ["2026-09-24", "La Mercè"], ["2026-10-12", "Festa Nacional d'Espanya"], ["2026-12-08", "La Immaculada"],
    ["2026-12-25", "Nadal"], ["2026-12-26", "Sant Esteve"],
  ];
  for (const [d, n] of festius) await sql`insert into public.holidays (day, name) values (${d}, ${n})`;
}

// ---------------------------------------------------------------------------
// 2. Temps de Barcelona (Open-Meteo)
// ---------------------------------------------------------------------------

async function temps() {
  const base = "latitude=41.40&longitude=2.20&daily=precipitation_sum,temperature_2m_max&timezone=Europe%2FMadrid";
  const files = new Map<string, { pluja: number; max: number | null }>();
  const afegeix = (j: { daily?: { time: string[]; precipitation_sum: (number | null)[]; temperature_2m_max: (number | null)[] } }) =>
    j.daily?.time.forEach((t, i) => {
      if (j.daily!.precipitation_sum[i] == null) return;
      files.set(t, { pluja: j.daily!.precipitation_sum[i] ?? 0, max: j.daily!.temperature_2m_max[i] });
    });

  try {
    const r1 = await fetch(`https://archive-api.open-meteo.com/v1/archive?${base}&start_date=${obertura}&end_date=${dia(-2)}`);
    if (r1.ok) afegeix(await r1.json());
    const r2 = await fetch(`https://api.open-meteo.com/v1/forecast?${base}&past_days=14&forecast_days=7`);
    if (r2.ok) afegeix(await r2.json());
  } catch {
    // sense xarxa: ho omplim nosaltres
  }

  let font = "open-meteo";
  if (files.size < DIES_HISTORIA / 2) {
    font = "simulat";
    for (let o = -DIES_HISTORIA; o <= 7; o++) {
      const m = local(new Date(ara.getTime() + o * 86400000)).mes;
      const plou = Math.random() < (m >= 8 ? 0.28 : 0.15);
      files.set(dia(o), { pluja: plou ? Math.round(Math.random() * 150) / 10 + 1 : 0, max: [14, 15, 17, 19, 22, 26, 29, 29, 26, 22, 17, 14][m] });
    }
  }
  for (const [d, w] of files) {
    await sql`insert into public.weather_daily (day, rain_mm, temp_max, source) values (${d}, ${w.pluja}, ${w.max}, ${font})
      on conflict (day) do update set rain_mm = excluded.rain_mm, temp_max = excluded.temp_max, source = excluded.source`;
  }
  return { dies: files.size, font };
}

// ---------------------------------------------------------------------------
// 3. Clients
// ---------------------------------------------------------------------------

const nomsF = ["Laia", "Núria", "Carla", "Aina", "Berta", "Queralt", "Mireia", "Montse", "Gemma", "Rosa", "Elena", "Clara", "Paula", "Marta", "Júlia", "Anna", "Mariona", "Ona", "Txell", "Neus", "Sílvia", "Cristina", "Judit", "Alba", "Irene", "Ariadna", "Roser", "Èlia", "Lucía", "Sara", "Marina", "Helena"];
const nomsM = ["Jordi", "Pol", "Marc", "Oriol", "Ivan", "Hugo", "Arnau", "Dani", "Xavi", "Albert", "Sergi", "Joan", "Tomàs", "Pau", "Jaume", "Ferran", "Roger", "Bernat", "Quim", "Gerard", "Àlex", "Martí", "David", "Pere", "Enric", "Biel", "Nil", "Jan", "Carles", "Lluís", "Adrià", "Iker"];
const cognoms = ["Puig", "Vila", "Soler", "Ferrer", "Serra", "Pons", "Roca", "Font", "Mas", "Riera", "Vidal", "Sala", "Pujol", "Casals", "Bosch", "Camps", "Martí", "Torres", "García", "Martínez", "López", "Sánchez", "Romero", "Navarro", "Molina", "Rovira", "Batlle", "Codina", "Prat", "Valls", "Costa", "Bonet"];

const perfils = [
  { profile: "oficinista", n: 110, weight: 1.4 },
  { profile: "ocasional", n: 150, weight: 0.25 },
  { profile: "vega", n: 35, weight: 0.7 },
  { profile: "familia", n: 40, weight: 0.8 },
  { profile: "deixa", n: 25, weight: 1.4 },
  { profile: "estiu", n: 40, weight: 0.6 },
] as const;

async function clients() {
  const any = local(ara).any;
  let nous = 0;
  for (const p of perfils) {
    for (let i = 0; i < p.n; i++) {
      const f = faker.datatype.boolean();
      const first = faker.helpers.arrayElement(f ? nomsF : nomsM);
      const last = faker.helpers.arrayElement(cognoms);

      // Alta: la majoria els primers mesos; uns 28 l'últim mes.
      let alta: string;
      let activeFrom: string;
      let activeTo: string | null = null;
      if (p.profile === "estiu") {
        alta = `${any}-07-${String(faker.number.int({ min: 1, max: 25 })).padStart(2, "0")}`;
        activeFrom = alta;
        activeTo = `${any}-08-31`;
      } else if (nous < 28 && p.profile !== "deixa" && faker.number.float() < 0.09) {
        alta = dia(-faker.number.int({ min: 1, max: 29 }));
        activeFrom = alta;
        nous++;
      } else {
        alta = dia(-faker.number.int({ min: 35, max: DIES_HISTORIA - 2 }));
        activeFrom = alta;
      }
      if (p.profile === "deixa") {
        alta = dia(-faker.number.int({ min: 90, max: DIES_HISTORIA - 2 }));
        activeFrom = alta;
        activeTo = dia(-faker.number.int({ min: 12, max: 34 }));
      }

      const wallet = faker.number.float() < 0.62;
      const consent = faker.number.float() < 0.55;
      const creat = await momentLocal(alta, `${faker.number.int({ min: 12, max: 21 })}:${faker.number.int({ min: 10, max: 59 })}:00`);
      const email = `${faker.helpers.slugify(first + "." + last).toLowerCase()}${faker.number.int({ min: 1, max: 99 })}@exemple.cat`;

      const [{ id }] = await sql`
        insert into public.customers (first_name, last_name, gender, email, locale, consent_email, consent_at,
          wallet_apple_id, wallet_google_id, profile, simulated, created_at)
        values (${first}, ${last}, ${f ? "f" : "m"}, ${email},
          ${faker.helpers.weightedArrayElement([{ value: "ca", weight: 7 }, { value: "es", weight: 2 }, { value: "en", weight: 1 }])},
          ${consent}, ${consent ? creat : null},
          ${wallet && faker.datatype.boolean() ? `pass.${faker.string.alphanumeric(10)}` : null},
          ${wallet ? `gw.${faker.string.alphanumeric(10)}` : null},
          ${p.profile}, true, ${creat})
        returning id`;

      await sql`insert into public.sim_profiles (customer_id, profile, weight, active_from, active_to)
        values (${id}, ${p.profile}, ${p.weight * faker.number.float({ min: 0.6, max: 1.4 })}, ${activeFrom}, ${activeTo})`;

      // Aprenent: en registrar-se, un segell de regal
      await sql`insert into public.stamps (customer_id, order_id, word_id, created_at) values (${id}, null, ${faker.number.int({ min: 1, max: 8 })}, ${creat})`;
      await sql`insert into public.rewards (customer_id, kind, created_at) values (${id}, 'segell-regal', ${creat})`;
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Història de comandes i campanyes
// ---------------------------------------------------------------------------

const missatges = (id: string) => campanyes.find((c) => c.id === id)!.missatges;

async function campanyesFixes() {
  const recupera = campanyes.find((c) => c.id === "recupera-23")!;
  // Esborranys: els números {{…}} els omple el panell amb dades de SQL.
  await sql`
    insert into public.campaigns (slug, kind, segment, title, chips, reasons, messages, simpler_label, channel_wallet, channel_email,
      schedule_text, schedule_reason, preview_date, preview_time, status, proposed_label, created_at)
    values
    ('recupera-habituals', 'recuperacio', 'risc', 'Recupera {{n}} habituals',
      ${["{{n}} clients", "Venien 1-2 cops per setmana", "Més de 14 dies sense venir", "{{a_mig}} amb el carnet a mig fer"]},
      ${[
        "Són el {{pct_clients}} dels clients però feien el **{{pct_comandes}} de les comandes amb carnet**. Els últims 3 mesos hi van gastar uns {{cost}} al mes.",
        "A {{a_mig}} dels {{n}} els falten 3 paraules o menys per completar el carnet. És el millor ganxo: no cal cap descompte.",
        "L'última recuperació va fer tornar el **{{tornat}}** en 14 dies. Sense avís, només va tornar el {{control}}.",
      ]},
      ${sql.json(recupera.missatges)}, ${recupera.senseExtra ?? null}, true, true,
      'Dijous a les 11:30.', 'És quan aquest grup sol decidir on dina.', '4', '11:30', 'esborrany', 'Proposada avui a les 6:00', now()),
    ('segell-doble', 'franja', 'fluixes', 'Segell doble dt i dc al vespre',
      ${["Dimarts i dimecres", "De 20 a 22 h", "{{fluixes}} comandes de mitjana", "Tots els que tenen carnet"]},
      ${[
        "Són les quatre franges més fluixes: **{{fluixes}} comandes** de mitjana, quan el migdia en fa {{migdia}}.",
        "Quan vas provar el segell doble els dilluns al vespre: **{{prova}}**.",
        "Costa una paraula extra al carnet, no un descompte. El preu no es toca.",
      ]},
      ${sql.json(missatges("segell-doble"))}, null, true, false,
      'Dimarts a les 18:00.', 'Dues hores abans que obri la franja.', '2', '18:00', 'esborrany', 'Proposada avui', now()),
    ('carxofa', 'padro', 'bolets', 'La carxofa del Prat arriba',
      ${["{{bolets_n}} clients", "Van rebre l'avís dels bolets", "Alta al padró"]},
      ${[
        "L'avís dels bolets empadronats va fer tornar el **{{bolets_tornat}}** en 14 dies.",
        "Els {{bolets_n}} que el van rebre són el públic natural d'un ingredient nou.",
        "No hi ha cap promoció: l'alta al padró ja és la notícia.",
      ]},
      ${sql.json(missatges("carxofa"))}, null, true, true,
      'El dia de l''alta, a les 10:00.', 'Abans que es decideixi el dinar.', ${dia(26)}, '10:00', 'esborrany', 'Proposada ahir', now() - interval '1 day')`;
}

/** Envia una campanya en una data del passat: tria destinataris amb el que se sabia aquell dia. */
async function enviaCampanya(c: { slug: string; kind: string; title: string; messageId: string; enviada: Date; destinataris: string }) {
  await sql`select public.sim_fins(${c.enviada})`;
  const [{ id }] = await sql`
    insert into public.campaigns (slug, kind, title, messages, status, sent_at, proposed_label, channel_wallet, channel_email, created_at)
    values (${c.slug}, ${c.kind}, ${c.title}, ${sql.json(missatges(c.messageId))}, 'enviada', ${c.enviada},
      ${`Enviada el ${diaMes(c.enviada)}`}, true, true, ${c.enviada})
    returning id`;
  // 1 de cada 4 va al grup de control (no rep l'avís)
  await sql.unsafe(
    `insert into public.campaign_recipients (campaign_id, customer_id, control, sent_at)
     select $1, customer_id, random() < 0.25, $2 from (${c.destinataris}) d`,
    [id, c.enviada],
  );
}

async function historia() {
  await sql`insert into public.sim_config (key, value) values
    ('obertura', ${obertura}), ('ultim_tic', ${(await momentLocal(obertura, "00:00")).toISOString()})`;

  const t = (d: Date) => d.toISOString();

  // Prova del segell doble dels dilluns al vespre (fa ~5 setmanes)
  const dilluns = dillunsAbans(dia(-37));
  await enviaCampanya({
    slug: "segell-doble-dilluns", kind: "franja", title: "Segell doble dilluns al vespre", messageId: "segell-doble",
    enviada: await momentLocal(dilluns, "10:00"),
    destinataris: `select c.id as customer_id from public.customers c
      where (c.wallet_apple_id is not null or c.wallet_google_id is not null)
        and exists (select 1 from public.orders o where o.customer_id = c.id and o.created_at > '${t(await momentLocal(dilluns, "10:00"))}'::timestamptz - interval '30 days')`,
  });

  // Recuperació: habituals que fa 14-45 dies que no venen (fa ~4 setmanes)
  const recDia = dia(-27);
  const recAt = await momentLocal(recDia, "11:30");
  await enviaCampanya({
    slug: "recuperacio-anterior", kind: "recuperacio", title: `Recuperació ${deMes(local(recAt).mes)}`, messageId: "recupera-23",
    enviada: recAt,
    destinataris: `select customer_id from (
        select o.customer_id, count(*) n, max(o.created_at) ultima, min(o.created_at) primera
        from public.orders o where o.customer_id is not null and o.created_at < '${t(recAt)}'
        group by o.customer_id) x
      where n >= 4 and '${t(recAt)}'::timestamptz - ultima between interval '14 days' and interval '45 days'
        and extract(epoch from ultima - primera) / 86400 / (n - 1) <= 10`,
  });

  // Bolets empadronats (el dia de l'alta)
  const boletsAt = await momentLocal(dia(-12), "10:00");
  await enviaCampanya({
    slug: "bolets", kind: "padro", title: "Bolets empadronats", messageId: "carxofa",
    enviada: boletsAt,
    destinataris: `select c.id as customer_id from public.customers c
      where (c.consent_email or c.wallet_google_id is not null)
        and exists (select 1 from public.orders o where o.customer_id = c.id and o.created_at between '${t(boletsAt)}'::timestamptz - interval '60 days' and '${t(boletsAt)}')`,
  });

  // Fins ara mateix
  await sql`select public.sim_fins(now())`;
  // La producció de demà ja és planificada (la tasca de les 6:00 la farà cada dia)
}

// ---------------------------------------------------------------------------
// 5. Amo i .env.local
// ---------------------------------------------------------------------------

async function esperaAuth() {
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`${env.API_URL}/auth/v1/health`).catch(() => null);
    if (r?.ok) return;
    await new Promise((res) => setTimeout(res, 5000));
  }
  throw new Error("Supabase Auth no respon: torna-ho a provar quan `supabase status` estigui tot en marxa.");
}

async function amo() {
  await esperaAuth();
  const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: llista } = await admin.auth.admin.listUsers();
  let user = llista?.users.find((u) => u.email === AMO.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email: AMO.email, password: AMO.password, email_confirm: true });
    if (error) throw error;
    user = data.user!;
  }
  await sql`insert into public.owners (user_id) values (${user.id}) on conflict do nothing`;

  writeFileSync(
    ".env.local",
    `# Supabase local (generat per scripts/seed.ts). Només claus públiques.\nNEXT_PUBLIC_SUPABASE_URL=${env.API_URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${env.ANON_KEY}\n`,
  );
}

// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  const pas = (m: string) => console.log(`· ${m} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

  await netejar();
  pas("base de dades buidada");
  await dadesFixes();
  pas("carta, padró, paraules, veu i festius");
  const w = await temps();
  pas(`temps: ${w.dies} dies (${w.font})`);
  await clients();
  pas("clients i perfils");
  await campanyesFixes();
  await historia();
  const [{ n }] = await sql`select count(*)::int as n from public.orders`;
  pas(`${n} comandes en ${DIES_HISTORIA} dies`);
  await amo();
  pas(`amo: ${AMO.email} · .env.local escrit`);

  await sql`select cron.schedule('restaurant-viu', '*/2 * * * *', $$select public.posa_al_dia()$$)`;
  pas("restaurant viu: comandes noves cada 2 minuts en horari de servei");
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
