/**
 * Dades base de La Carmanyola (no simulades):
 *
 *   npm run db:seed
 *
 * · Carta, padró, paraules, veu de marca i les propostes en esborrany del panell.
 * · L'usuari amo del panell.
 * · .env.local (claus locals) i els secrets del Vault per al cron del simulador.
 *
 * Les dades simulades (clients, comandes, campanyes enviades) les crea `npm run sim:seed`.
 * Només per a la base de dades LOCAL.
 */

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { plats } from "../src/lib/data/carta";
import { campanyes } from "../src/lib/data/campanyes";
import { veuInicial } from "../src/lib/data/veu";
import { diaMes, local } from "../src/lib/dates";

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

const ara = new Date();
const dia = (offset: number) => {
  const d = new Date(ara.getTime() + offset * 86400000);
  const l = local(d);
  return `${l.any}-${String(l.mes + 1).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`;
};
// ---------------------------------------------------------------------------
// 1. Dades fixes
// ---------------------------------------------------------------------------

async function netejar() {
  await sql`
    truncate public.campaign_recipients, public.campaigns, public.campaign_requests, public.stamps, public.rewards,
      public.order_items, public.orders, public.sim_profiles, public.sim_runs, public.customers, public.leftovers,
      public.que_queda_alerts, public.production_plans, public.ingredient_alerts, public.dish_ingredients,
      public.ingredients, public.build_options, public.dishes, public.words, public.brand_voice
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
}

// ---------------------------------------------------------------------------
// Propostes en esborrany del panell (la IA les redacta; els números {{…}} surten de SQL)
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

// ---------------------------------------------------------------------------
// Amo, .env.local i Vault
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

  // SIM_SECRET: es conserva si ja existeix, perquè el Vault i l'app coincideixin.
  const anterior = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
  const secret = anterior.match(/^SIM_SECRET=(.+)$/m)?.[1] ?? randomBytes(24).toString("hex");
  writeFileSync(
    ".env.local",
    [
      "# Supabase local (generat per scripts/base-seed.ts). No es puja mai al repositori.",
      `NEXT_PUBLIC_SUPABASE_URL=${env.API_URL}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${env.ANON_KEY}`,
      "# Només servidor: rutes /api/sim i scripts",
      `SUPABASE_SERVICE_ROLE_KEY=${env.SERVICE_ROLE_KEY}`,
      `DATABASE_URL=${env.DB_URL}`,
      `SIM_SECRET=${secret}`,
      "",
    ].join("\n"),
  );

  // Vault: pg_cron + pg_net criden l'app amb aquest secret. En local, l'app és al host (passarel·la de Docker).
  const passarella = execFileSync("docker", ["network", "inspect", "supabase_network_la-carmanyola", "-f", "{{range .IPAM.Config}}{{.Gateway}} {{end}}"], {
    encoding: "utf8",
  })
    .split(/\s+/)
    .find((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
  const appUrl = `http://${passarella || "172.17.0.1"}:3000`;
  await sql`delete from vault.secrets where name in ('sim_secret', 'sim_app_url')`;
  await sql`select vault.create_secret(${secret}, 'sim_secret', 'Bearer de les rutes /api/sim')`;
  await sql`select vault.create_secret(${appUrl}, 'sim_app_url', 'URL base de l''app per al cron del simulador')`;
  return appUrl;
}

// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  const pas = (m: string) => console.log(`· ${m} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

  await netejar();
  pas("base de dades buidada");
  await dadesFixes();
  pas("carta, padró, paraules i veu de marca");
  await campanyesFixes();
  pas("propostes en esborrany");
  const appUrl = await amo();
  pas(`amo: ${AMO.email} · .env.local escrit · Vault: ${appUrl}`);
  console.log("Ara: npm run sim:seed");
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
