/** Qui demana: probabilitat de cada client registrat en una franja, i alta de clients nous. */

import { fakerDE, fakerEN, fakerES, fakerFR, fakerIT, type Faker } from "@faker-js/faker";
import {
  CAMPAIGN_BOOST,
  CAMPAIGN_WINDOW_DAYS,
  CHURN,
  DISH_POPULARITY,
  EMAIL_DOMAIN,
  INTERNATIONAL_SHARE_OF_EN,
  LOCALES,
  MARKETING_CONSENT,
  PROFILES,
  WALLET_SHARE,
  type Perfil,
} from "./config";
import { addDays, isoDow, type Slot } from "./calendar";
import { pesCorba } from "./demand";
import { Rng } from "./rng";
import type { SimContext, SimCustomer, SimDish } from "./types";

const DIA_MS = 86400000;

/** Probabilitat que cada client registrat demani en aquesta franja (abans de reescalar). */
export function probabilitatsClients(slot: Slot, ctx: SimContext): { client: SimCustomer; p: number }[] {
  const dow = isoDow(slot.day);
  const pes = pesCorba(slot);
  const out: { client: SimCustomer; p: number }[] = [];
  for (const c of ctx.customers) {
    if (c.created_at > slot.start || c.service !== slot.service || !c.days.includes(dow)) continue;
    let rate = c.weekly_rate;
    if (c.churns_at && slot.day >= c.churns_at) rate *= CHURN.residualRate;
    let p = (rate / c.days.length) * pes;
    const rebut = ctx.campaigns.some(
      (k) => k.recipients.has(c.id) && slot.start >= k.sent_at && slot.start.getTime() < k.sent_at.getTime() + CAMPAIGN_WINDOW_DAYS * DIA_MS,
    );
    if (rebut) p *= CAMPAIGN_BOOST;
    out.push({ client: c, p: Math.min(0.95, p) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Altes
// ---------------------------------------------------------------------------

const nomsF = ["Laia", "Núria", "Carla", "Aina", "Berta", "Queralt", "Mireia", "Montse", "Gemma", "Rosa", "Elena", "Clara", "Paula", "Marta", "Júlia", "Anna", "Mariona", "Ona", "Txell", "Neus", "Sílvia", "Cristina", "Judit", "Alba", "Irene", "Ariadna", "Roser", "Èlia", "Meritxell", "Sara", "Marina", "Helena", "Abril", "Martina", "Jana", "Bruna", "Carlota", "Àngels", "Assumpta", "Montserrat"];
const nomsM = ["Jordi", "Pol", "Marc", "Oriol", "Ivan", "Hugo", "Arnau", "Dani", "Xavi", "Albert", "Sergi", "Joan", "Tomàs", "Pau", "Jaume", "Ferran", "Roger", "Bernat", "Quim", "Gerard", "Àlex", "Martí", "David", "Pere", "Enric", "Biel", "Nil", "Jan", "Carles", "Lluís", "Adrià", "Eloi", "Guillem", "Aleix", "Genís", "Ot", "Pep", "Miquel", "Josep", "Xavier"];
const cognoms = ["Puig", "Vila", "Soler", "Ferrer", "Serra", "Pons", "Roca", "Font", "Mas", "Riera", "Vidal", "Sala", "Pujol", "Casals", "Bosch", "Camps", "Martí", "Torres", "Rovira", "Batlle", "Codina", "Prat", "Valls", "Costa", "Bonet", "Sabaté", "Grau", "Comas", "Tarrés", "Planas", "Coll", "Ribas", "Badia", "Vilaró", "Esteve", "Fabra", "Gispert", "Llobet", "Noguera", "Oller", "Rius", "Solà", "Tort", "Viladecans", "Junyent", "Bertran", "Clos"];

export interface NouClient {
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    locale: "ca" | "es" | "en";
    consent_email: boolean;
    consent_at: string | null;
    wallet_apple_id: string | null;
    wallet_google_id: string | null;
    simulated: true;
    created_at: string;
  };
  profile: Omit<SimCustomer, "created_at"> & { customer_id: string };
}

function triaPerfil(rng: Rng): Perfil {
  return rng.weighted(Object.keys(PROFILES) as Perfil[], (p) => PROFILES[p].weight)!;
}

/** Plats preferits coherents amb el perfil (els vegans, només opcions veganes). */
function preferits(rng: Rng, perfil: Perfil, plats: SimDish[]): number[] {
  const candidats = plats.filter((d) => (d.section === "casa" || d.section === "fes") && (perfil !== "vega" || d.tags.includes("vegà")));
  const n = Math.min(candidats.length, rng.int(2, 3));
  const triats: number[] = [];
  while (triats.length < n) {
    const d = rng.weighted(
      candidats.filter((c) => !triats.includes(c.id)),
      (c) => DISH_POPULARITY[c.slug] ?? 0.5,
    );
    if (!d) break;
    triats.push(d.id);
  }
  return triats;
}

function fakerPerLocale(rng: Rng, locale: "es" | "en"): Faker {
  if (locale === "es") return fakerES;
  return rng.bool(INTERNATIONAL_SHARE_OF_EN) ? rng.pick([fakerFR, fakerIT, fakerDE]) : fakerEN;
}

const treuAccents = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "").toLowerCase();

/**
 * Un client nou amb perfil ocult. `seed` el fa determinista;
 * `avui` és el dia local de referència per als desertors.
 */
export function nouClient(seed: string, creat: Date, plats: SimDish[], avui: string): NouClient {
  const rng = new Rng(`carmanyola:client:${seed}`);
  const locale = rng.weighted(["ca", "es", "en"] as const, (l) => LOCALES[l])!;
  const femeni = rng.bool(0.5);
  let first: string;
  let last: string;
  if (locale === "ca") {
    first = rng.pick(femeni ? nomsF : nomsM);
    last = rng.pick(cognoms);
  } else {
    const f = fakerPerLocale(rng, locale);
    f.seed(Math.floor(rng.next() * 2 ** 31));
    first = f.person.firstName(femeni ? "female" : "male");
    last = f.person.lastName();
  }

  const dia = creat.toISOString().slice(0, 10);
  let perfil = triaPerfil(rng);
  // Un desertor necessita temps per deixar de venir: si s'ha donat d'alta fa poc, és oficinista.
  if (perfil === "desertor" && dia > addDays(avui, -(CHURN.afterDays[0] + CHURN.minDaysAgo))) perfil = "oficinista";
  const def = PROFILES[perfil];
  const id = rng.uuid();
  const consent = rng.bool(MARKETING_CONSENT);
  const wallet = rng.bool(WALLET_SHARE);

  let churns: string | null = null;
  if (perfil === "desertor") {
    const candidat = addDays(dia, rng.int(...CHURN.afterDays));
    const limit = addDays(avui, -CHURN.minDaysAgo);
    churns = candidat < limit ? candidat : limit;
  }

  return {
    customer: {
      id,
      first_name: first,
      last_name: last,
      email: `${treuAccents(first)}.${treuAccents(last)}.${rng.hex(4)}@${EMAIL_DOMAIN}`,
      locale,
      consent_email: consent,
      consent_at: consent ? creat.toISOString() : null,
      wallet_apple_id: wallet && rng.bool(0.5) ? `pass.${rng.hex(10)}` : null,
      wallet_google_id: wallet ? `gw.${rng.hex(10)}` : null,
      simulated: true,
      created_at: creat.toISOString(),
    },
    profile: {
      id,
      customer_id: id,
      profile: perfil,
      weekly_rate: Math.round(rng.float(...def.perWeek) * 100) / 100,
      days: def.days,
      service: def.service,
      favourite_dish_ids: preferits(rng, perfil, plats),
      scan_prob: def.scan,
      churns_at: churns,
    },
  };
}
