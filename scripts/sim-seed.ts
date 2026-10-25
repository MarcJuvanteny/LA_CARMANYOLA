/**
 * npm run sim:seed
 *
 * Esborra NOMÉS les dades simulades (simulated = true) i les torna a crear:
 * festius, temps de Barcelona, ~400 clients amb perfil ocult, 5 campanyes passades amb
 * destinataris i grup de control, i totes les franges des de SIM_OPENING_DATE fins ara.
 * Les comandes reals (Stripe en mode de prova, simulated = false) no es toquen.
 */

import postgres from "postgres";
import { addDays, diaLocal, momentLocal } from "../src/lib/sim/calendar";
import { simulateUntil } from "../src/lib/sim/catchup";
import { CONTROL_SHARE, LAUNCH, SIM_OPENING_DATE, TOTAL_CUSTOMERS } from "../src/lib/sim/config";
import { nouClient } from "../src/lib/sim/customers";
import { carregaContext, serviceClient } from "../src/lib/sim/db";
import { desaFestius, desaTemps, tempsHistoric, tempsRecent } from "../src/lib/sim/externs";
import { Rng } from "../src/lib/sim/rng";
import { diaMes } from "../src/lib/dates";

const db = serviceClient();
const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
const t0 = Date.now();
const pas = (m: string) => console.log(`· ${m} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
const avui = diaLocal(new Date());

// ---------------------------------------------------------------------------
// Campanyes passades. Els destinataris es trien amb el que se sabia el dia de l'enviament.
// ---------------------------------------------------------------------------

const tots = (ca: string, es: string, en: string) => {
  const m = { ca, es, en };
  return { original: m, curt: m, calid: m, senseExtra: m };
};

const actiusAmbCanal = (dies: number) => `
  select c.id from public.customers c
  where c.simulated and (c.wallet_apple_id is not null or c.wallet_google_id is not null or c.consent_email)
    and exists (select 1 from public.comandes_valides o where o.customer_id = c.id
      and o.created_at between $1::timestamptz - interval '${dies} days' and $1::timestamptz)`;

const campanyes = [
  {
    slug: "segell-doble-dijous",
    kind: "franja",
    title: "Segell doble dijous al vespre",
    enviada: ["2026-06-01", "10:00"],
    doble: { days: [4], from: "19:30", to: "22:30", starts: "2026-06-04", ends: "2026-06-25" },
    missatge: tots(
      "{nom}, aquest juny els dijous al vespre la teva carmanyola suma dues paraules al carnet.",
      "{nom}, este junio los jueves por la noche tu carmanyola suma dos palabras en el carnet.",
      "{nom}, this June, Thursday evenings your carmanyola adds two words to your card.",
    ),
    destinataris: actiusAmbCanal(30),
  },
  {
    slug: "benvinguda-estiu",
    kind: "calendari",
    title: "Benvinguda als nous de l'estiu",
    enviada: ["2026-07-20", "10:00"],
    missatge: tots(
      "{nom}, benvingut al barri. Et falta la paraula «{paraula}»: la propera carmanyola te la torna.",
      "{nom}, bienvenido al barrio. Te falta la palabra «{paraula}»: la próxima carmanyola te la devuelve.",
      "{nom}, welcome to the neighbourhood. You're missing “{paraula}”: your next carmanyola brings it back.",
    ),
    destinataris: `
      select c.id from public.customers c
      where c.simulated and c.created_at between $1::timestamptz - interval '45 days' and $1::timestamptz
        and (c.wallet_apple_id is not null or c.wallet_google_id is not null or c.consent_email)`,
  },
  {
    slug: "segell-doble-dilluns",
    kind: "franja",
    title: "Segell doble dilluns al vespre",
    enviada: ["2026-09-07", "10:00"],
    doble: { days: [1], from: "19:30", to: "22:30", starts: "2026-09-07", ends: "2026-09-28" },
    missatge: tots(
      "{nom}, aquest setembre els dilluns al vespre la teva carmanyola suma dues paraules al carnet.",
      "{nom}, este septiembre los lunes por la noche tu carmanyola suma dos palabras en el carnet.",
      "{nom}, this September, Monday evenings your carmanyola adds two words to your card.",
    ),
    destinataris: actiusAmbCanal(30),
  },
  {
    slug: "recuperacio-setembre",
    kind: "recuperacio",
    title: "Recuperació de setembre",
    enviada: ["2026-09-17", "11:30"],
    missatge: tots(
      "Fa dies que no et veiem, {nom}. Et falta recuperar la paraula «{paraula}». Aquesta setmana, la teva carmanyola suma doble.",
      "Hace días que no te vemos, {nom}. Te falta recuperar la palabra «{paraula}». Esta semana, tu carmanyola suma doble.",
      "We haven't seen you in a while, {nom}. You still need to win back the word “{paraula}”. This week, your carmanyola counts double.",
    ),
    // La mateixa regla que el panell: més del doble del seu temps habitual sense venir.
    destinataris: `
      select customer_id as id from (
        select o.customer_id, count(*) as n, min(o.created_at) as primera, max(o.created_at) as ultima
        from public.comandes_valides o
        join public.customers c on c.id = o.customer_id and c.simulated
        where o.created_at < $1::timestamptz
        group by o.customer_id
      ) x
      where n >= 4
        and extract(epoch from ultima - primera) / 86400 / (n - 1) <= 10
        and extract(epoch from $1::timestamptz - ultima) / 86400 > 2 * extract(epoch from ultima - primera) / 86400 / (n - 1)
        and $1::timestamptz - ultima <= interval '45 days'`,
  },
  {
    slug: "bolets",
    kind: "padro",
    title: "Bolets empadronats",
    enviada: ["2026-10-02", "10:00"],
    missatge: tots(
      "{nom}, els bolets del Solsonès s'empadronen a La Carmanyola. El fricandó ja és a la carta.",
      "{nom}, las setas del Solsonès se empadronan en La Carmanyola. El fricandó ya está en la carta.",
      "{nom}, mushrooms from the Solsonès are moving in at La Carmanyola. The fricandó is back on the menu.",
    ),
    destinataris: actiusAmbCanal(60),
  },
];

async function enviaCampanya(c: (typeof campanyes)[number]) {
  const enviada = momentLocal(c.enviada[0], c.enviada[1]);
  if (enviada > new Date()) return null;
  const r = await simulateUntil(db, enviada);
  const [{ id }] = await sql`
    insert into public.campaigns (slug, kind, title, messages, status, sent_at, proposed_label, channel_wallet, channel_email,
      simulated, double_days, double_from, double_to, starts_on, ends_on, created_at)
    values (${c.slug}, ${c.kind}, ${c.title}, ${sql.json(c.missatge)}, 'enviada', ${enviada}, ${`Enviada el ${diaMes(enviada)}`},
      true, true, true, ${c.doble?.days ?? null}, ${c.doble?.from ?? null}, ${c.doble?.to ?? null},
      ${c.doble?.starts ?? null}, ${c.doble?.ends ?? null}, ${enviada})
    returning id`;
  const ids = (await sql.unsafe(c.destinataris, [enviada.toISOString()])) as unknown as { id: string }[];
  // Grup de control determinista: 1 de cada 4 no rep l'avís.
  const files = ids.map(({ id: customer }) => ({
    campaign_id: id,
    customer_id: customer,
    control: new Rng(`carmanyola:control:${c.slug}:${customer}`).bool(CONTROL_SHARE),
    sent_at: enviada,
  }));
  if (files.length) await sql`insert into public.campaign_recipients ${sql(files)}`;
  return { franges: r.franges, destinataris: files.length };
}

// ---------------------------------------------------------------------------

async function main() {
  // 1. Fora el que és simulat (les comandes reals es queden)
  await sql`delete from public.orders where simulated`;
  await sql`delete from public.campaigns where simulated`;
  await sql`delete from public.customers where simulated`;
  await sql`delete from public.sim_runs`;
  await sql`delete from public.leftovers`;
  pas("dades simulades esborrades");

  // 2. Festius i temps
  const nf = await desaFestius(db);
  let nt = 0;
  try {
    nt += await desaTemps(db, await tempsHistoric(SIM_OPENING_DATE, addDays(avui, -3)));
    nt += await desaTemps(db, await tempsRecent(10, 3));
  } catch (e) {
    console.warn(`  Open-Meteo no respon (${(e as Error).message}): es fa servir el temps que ja hi hagi a la base de dades.`);
  }
  pas(`${nf} festius · ${nt} dies de temps (Open-Meteo)`);

  // 3. Clients: més altes les primeres setmanes (Operació Desbowlitzar), després degoteig
  const ctx = await carregaContext(db);
  const rng = new Rng("carmanyola:altes");
  const diesTotals = Math.max(1, (new Date(`${avui}T12:00:00Z`).getTime() - new Date(`${SIM_OPENING_DATE}T12:00:00Z`).getTime()) / 86400000);
  const llancament = LAUNCH.weeks * 7;
  const nous = Array.from({ length: TOTAL_CUSTOMERS }, (_, i) => {
    const dia = rng.bool(LAUNCH.share)
      ? addDays(SIM_OPENING_DATE, rng.int(0, llancament - 1))
      : addDays(SIM_OPENING_DATE, rng.int(llancament, Math.max(llancament, diesTotals - 1)));
    const creat = momentLocal(dia, `${rng.int(12, 21)}:${String(rng.int(0, 59)).padStart(2, "0")}`);
    return nouClient(`seed-${i}`, creat, ctx.dishes, avui);
  });
  await sql`insert into public.customers ${sql(nous.map((n) => n.customer))}`;
  await sql`insert into public.sim_profiles ${sql(
    nous.map(({ profile: p }) => ({
      customer_id: p.customer_id,
      profile: p.profile,
      weekly_rate: p.weekly_rate,
      days: p.days,
      service: p.service,
      favourite_dish_ids: p.favourite_dish_ids,
      scan_prob: p.scan_prob,
      churns_at: p.churns_at,
    })),
  )}`;
  await sql`select public.registra_segell_regal(id, created_at) from public.customers where simulated`;
  pas(`${nous.length} clients amb perfil ocult i segell de regal`);

  // 4. Història, amb les campanyes enviades al seu dia
  for (const c of campanyes) {
    const r = await enviaCampanya(c);
    if (r) pas(`${c.title}: ${r.destinataris} destinataris (${r.franges} franges simulades abans)`);
  }
  const r = await simulateUntil(db, new Date(), (f, t) => process.stdout.write(`\r  franges ${f}/${t}`));
  process.stdout.write("\n");
  const [{ n, f }] = await sql`select (select count(*) from public.orders where simulated)::int as n, (select count(*) from public.sim_runs)::int as f`;
  pas(`${n} comandes en ${f} franges (darrer tram: ${r.franges} franges)`);
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
