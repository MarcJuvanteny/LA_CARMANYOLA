/**
 * npm run sim:report — informe de coherència del simulador (criteris d'acceptació).
 * Fa servir sim_profiles només per verificar; el panell no els llegeix mai.
 */

import postgres from "postgres";
import { simulateUntil } from "../src/lib/sim/catchup";
import { SIM_TARDOR } from "../src/lib/sim/config";
import { serviceClient } from "../src/lib/sim/db";

const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
const files: [string, string, boolean][] = [];
const check = (nom: string, valor: string, ok: boolean) => files.push([nom, valor, ok]);
const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
const num = (x: unknown) => Number(x ?? 0);

// Dies complets: de l'obertura fins ahir
const fins = sql`public.dia_local(now())`;

async function main() {
  // 1. Volum del dinar entre setmana
  const [dinar] = await sql`
    with dies as (
      select public.dia_local(o.created_at) as dia, count(*) as n
      from public.comandes_valides o
      where o.simulated and public.servei_de_franja(public.franja_de(o.created_at)) = 'migdia'
        and extract(isodow from o.created_at at time zone 'Europe/Madrid') between 1 and 5
        and public.dia_local(o.created_at) < ${fins}
      group by 1
    )
    select avg(n) as mitjana, avg(case when n between 60 and 80 then 1 else 0 end) as dins, min(n) as mn, max(n) as mx from dies`;
  check("Dinar entre setmana (comandes/dia)", `mitjana ${num(dinar.mitjana).toFixed(1)} · min ${dinar.mn} · max ${dinar.mx} · ${pct(num(dinar.dins))} dels dies dins 60-80`, num(dinar.mitjana) >= 60 && num(dinar.mitjana) <= 80);

  // 2. Diumenges i festius
  const [tancat] = await sql`
    select count(*)::int as n from public.orders o
    where o.simulated and (extract(isodow from o.pickup_at at time zone 'Europe/Madrid') = 7
      or exists (select 1 from public.holidays h where h.day = public.dia_local(o.pickup_at)))`;
  check("Comandes en diumenge o festiu", String(tancat.n), tancat.n === 0);

  // 3. Fora d'horari
  const [fora] = await sql`
    select count(*)::int as n from public.orders o
    where o.simulated and not (
      (o.pickup_at at time zone 'Europe/Madrid')::time >= '12:30' and (o.pickup_at at time zone 'Europe/Madrid')::time < '16:00'
      or (o.pickup_at at time zone 'Europe/Madrid')::time >= '19:30' and (o.pickup_at at time zone 'Europe/Madrid')::time < '22:30')`;
  check("Comandes fora d'horari", String(fora.n), fora.n === 0);

  // 4. Tiquet mitjà
  const [tiquet] = await sql`
    select avg(total_cents) / 100.0 as t,
      avg(total_cents) filter (where public.servei_de_franja(public.franja_de(created_at)) = 'migdia') / 100.0 as dinar,
      avg(total_cents) filter (where public.servei_de_franja(public.franja_de(created_at)) = 'vespre') / 100.0 as sopar
    from public.comandes_valides where simulated`;
  check("Tiquet mitjà", `${num(tiquet.t).toFixed(2)} € (dinar ${num(tiquet.dinar).toFixed(2)} € · sopar ${num(tiquet.sopar).toFixed(2)} €)`, num(tiquet.t) >= 13 && num(tiquet.t) <= 16);

  // 5. Dimarts i dimecres al vespre
  const sopars = await sql`
    with dies as (
      select public.dia_local(created_at) as dia, extract(isodow from created_at at time zone 'Europe/Madrid')::int as dow, count(*) as n
      from public.comandes_valides
      where simulated and public.servei_de_franja(public.franja_de(created_at)) = 'vespre' and public.dia_local(created_at) < ${fins}
      group by 1, 2
    )
    select dow, avg(n) as n from dies group by dow order by dow`;
  const mitjana = sopars.reduce((s, r) => s + num(r.n), 0) / Math.max(1, sopars.length);
  const dtdc = sopars.filter((r) => r.dow === 2 || r.dow === 3).reduce((s, r) => s + num(r.n), 0) / 2;
  check("Sopar dt-dc vs mitjana", `${dtdc.toFixed(1)} vs ${mitjana.toFixed(1)} (${sopars.map((r) => `${["", "dl", "dt", "dc", "dj", "dv", "ds"][r.dow]} ${num(r.n).toFixed(1)}`).join(" · ")})`, dtdc < mitjana * 0.75);

  // 6. Fricandó i pluja (dins la temporada)
  const [fric] = await sql`
    with v as (
      select (coalesce(w.rain_mm, 0) > 2) as plou, sum(oi.qty) filter (where d.slug = 'fricando-amb-bolets') as fric, sum(oi.qty) as tots,
        count(distinct public.dia_local(o.created_at)) as dies
      from public.comandes_valides o
      join public.order_items oi on oi.order_id = o.id
      join public.dishes d on d.id = oi.dish_id and d.section in ('casa', 'fes')
      left join public.weather_daily w on w.day = public.dia_local(o.created_at)
      where o.simulated and public.dia_local(o.created_at) >= ${SIM_TARDOR.from}::date
      group by 1
    )
    select max(fric::numeric / tots) filter (where plou) as pluja, max(fric::numeric / tots) filter (where not plou) as sec,
      max(dies) filter (where plou) as dies_pluja from v`;
  check("Fricandó amb pluja vs sense", `${pct(num(fric.pluja))} vs ${pct(num(fric.sec))} de les carmanyoles (${fric.dies_pluja ?? 0} dies de pluja a la tardor)`, num(fric.pluja) > num(fric.sec));

  // 7. Plats de tardor abans de l'alta
  const [tardor] = await sql`
    select count(*)::int as n, min(public.dia_local(o.created_at)) as primer
    from public.orders o join public.order_items oi on oi.order_id = o.id join public.dishes d on d.id = oi.dish_id
    where o.simulated and d.season = 'tardor' and public.dia_local(o.pickup_at) < ${SIM_TARDOR.from}::date`;
  const [primer] = await sql`
    select min(public.dia_local(o.pickup_at)) as d from public.orders o join public.order_items oi on oi.order_id = o.id
    join public.dishes d on d.id = oi.dish_id where o.simulated and d.season = 'tardor'`;
  check(`Plats de tardor abans del ${SIM_TARDOR.from}`, `${tardor.n} (primera venda: ${primer.d ? String(primer.d).slice(0, 10) : "cap"})`, tardor.n === 0);

  // 8. Canal directe per mes
  const mesos = await sql`
    select to_char(created_at at time zone 'Europe/Madrid', 'YYYY-MM') as mes, avg(case when channel <> 'plataforma' then 1 else 0 end) as directe
    from public.comandes_valides where simulated group by 1 order by 1`;
  const creixent = mesos.every((m, i) => i === 0 || num(m.directe) >= num(mesos[i - 1].directe) - 0.01);
  check("Canal directe creixent mes a mes", mesos.map((m) => `${m.mes.slice(5)} ${pct(num(m.directe))}`).join(" · "), creixent);

  // 9. Segells en comandes directes
  const [seg] = await sql`
    select count(s.id)::numeric / count(o.id) as r from public.comandes_valides o
    left join public.stamps s on s.order_id = o.id
    where o.simulated and o.channel <> 'plataforma'`;
  const [segPlat] = await sql`
    select count(*)::int as n from public.stamps s join public.orders o on o.id = s.order_id where o.channel = 'plataforma'`;
  check("Comandes directes amb segell", `${pct(num(seg.r))} · segells en plataformes: ${segPlat.n}`, num(seg.r) >= 0.35 && num(seg.r) <= 0.45 && segPlat.n === 0);

  // 10. Desertors detectables
  const [des] = await sql`
    with c as (
      select o.customer_id, count(*) as n, min(o.created_at) as primera, max(o.created_at) as ultima
      from public.comandes_valides o where o.customer_id is not null group by 1
    ),
    regla as (
      select c.customer_id, p.profile,
        (c.n >= 4 and extract(epoch from now() - c.ultima) > 2 * extract(epoch from c.ultima - c.primera) / (c.n - 1)) as detectat
      from c join public.sim_profiles p on p.customer_id = c.customer_id
    )
    select count(*) filter (where profile = 'desertor') as desertors,
      count(*) filter (where profile = 'desertor' and detectat) as detectats,
      count(*) filter (where profile <> 'desertor' and detectat) as falsos,
      count(*) filter (where profile = 'oficinista') as oficinistes,
      count(*) filter (where profile = 'oficinista' and detectat) as ofi_detectats
    from regla`;
  check(
    "Desertors detectables (regla 2× freqüència)",
    `${des.detectats}/${des.desertors} desertors · ${des.falsos} altres clients també marcats (${des.ofi_detectats}/${des.oficinistes} oficinistes)`,
    num(des.desertors) > 0 && num(des.detectats) / num(des.desertors) >= 0.8,
  );

  // 11. Campanyes vs grup de control
  const camps = await sql`
    select c.title,
      count(*) filter (where not r.control) as n, count(*) filter (where r.control) as nc,
      avg(case when exists (select 1 from public.comandes_valides o where o.customer_id = r.customer_id
        and o.created_at > c.sent_at and o.created_at <= c.sent_at + interval '14 days') then 1 else 0 end) filter (where not r.control) as tornat,
      avg(case when exists (select 1 from public.comandes_valides o where o.customer_id = r.customer_id
        and o.created_at > c.sent_at and o.created_at <= c.sent_at + interval '14 days') then 1 else 0 end) filter (where r.control) as control
    from public.campaigns c join public.campaign_recipients r on r.campaign_id = c.id
    where c.simulated group by c.id, c.title, c.sent_at order by c.sent_at`;
  for (const c of camps) {
    check(`Campanya «${c.title}»`, `torna ${pct(num(c.tornat))} (n=${c.n}) vs control ${pct(num(c.control))} (n=${c.nc})`, num(c.tornat) > num(c.control));
  }

  // 12. Idempotència: dos tics seguits
  const db = serviceClient();
  const a = await simulateUntil(db);
  const b = await simulateUntil(db);
  check("sim:tick dues vegades seguides", `1r: ${a.comandes} comandes · 2n: ${b.comandes} comandes (${b.franges} franges)`, b.comandes === 0 && b.franges === 0);

  // Informe
  const amplada = Math.max(...files.map((f) => f[0].length));
  console.log("\nInforme del simulador\n");
  for (const [nom, valor, ok] of files) console.log(`${ok ? "✓" : "✗"} ${nom.padEnd(amplada)}  ${valor}`);
  console.log(`\n${files.filter((f) => f[2]).length}/${files.length} criteris complerts`);
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
