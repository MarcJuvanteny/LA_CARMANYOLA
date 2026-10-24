import { describe, expect, it } from "vitest";
import { SIM_TARDOR } from "./config";
import { addDays, frangesDia, frangesEntre, horaLocal, isoDow, momentLocal } from "./calendar";
import { nouClient } from "./customers";
import { planSlot } from "./simulate";
import type { SimContext, SimDish } from "./types";

// Carta mínima amb la forma de la taula `dishes` (els valors reals es llegeixen de la BD).
const plats: SimDish[] = [
  { id: 1, slug: "la-de-sempre", section: "casa", price_cents: 1250, season: "tot l'any", tags: [], available: true, supplement: null },
  { id: 2, slug: "l-esqueixat", section: "casa", price_cents: 1350, season: "tot l'any", tags: ["fred"], available: true, supplement: null },
  { id: 3, slug: "tot-escalivat", section: "casa", price_cents: 1190, season: "tot l'any", tags: ["vegà"], available: true, supplement: { name: "Amb anxoves", price_cents: 200 } },
  { id: 4, slug: "fricando-amb-bolets", section: "casa", price_cents: 1390, season: "tardor", tags: [], available: true, supplement: null },
  { id: 5, slug: "la-castanyera", section: "casa", price_cents: 1290, season: "tardor", tags: ["vegetarià"], available: true, supplement: null },
  { id: 6, slug: "fes-te-l-tu", section: "fes", price_cents: 1190, season: "tot l'any", tags: [], available: true, supplement: null },
  { id: 7, slug: "coca-de-recapte", section: "acompanyar", price_cents: 450, season: "tot l'any", tags: [], available: true, supplement: null },
  { id: 8, slug: "crema-catalana", section: "postres", price_cents: 450, season: "tot l'any", tags: [], available: true, supplement: null },
  { id: 9, slug: "aigua", section: "begudes", price_cents: 180, season: "tot l'any", tags: [], available: true, supplement: null },
];

function context(): SimContext {
  const customers = Array.from({ length: 120 }, (_, i) => {
    const nou = nouClient(`test-${i}`, new Date("2026-04-20T11:00:00Z"), plats, "2026-10-24");
    return { ...nou.profile, created_at: new Date(nou.customer.created_at) };
  });
  return { dishes: plats, customers, holidays: new Set(["2026-05-25", "2026-09-24"]), rain: new Map([["2026-10-21", 8]]), campaigns: [] };
}

const setmana = (dilluns: string, ctx: SimContext) =>
  frangesEntre(momentLocal(addDays(dilluns, -1), "23:59"), momentLocal(addDays(dilluns, 7), "00:00"), ctx.holidays);

describe("simulador", () => {
  const ctx = context();

  it("una franja és determinista", () => {
    const slot = frangesDia("2026-10-21", ctx.holidays)[5];
    const a = planSlot(slot, ctx);
    const b = planSlot(slot, context());
    expect(a.orders.length).toBeGreaterThan(0);
    expect(b).toEqual(a);
  });

  it("no hi ha cap comanda en diumenge ni en festiu", () => {
    expect(frangesDia("2026-10-25", ctx.holidays)).toHaveLength(0); // diumenge
    expect(frangesDia("2026-09-24", ctx.holidays)).toHaveLength(0); // la Mercè
    const franges = setmana("2026-10-19", ctx);
    expect(franges.some((s) => isoDow(s.day) === 7)).toBe(false);
  });

  it("no hi ha cap comanda fora d'horari", () => {
    for (const slot of setmana("2026-10-19", ctx)) {
      const h = horaLocal(slot.start);
      const dins = (h >= "12:30" && h < "16:00") || (h >= "19:30" && h < "22:30");
      expect(dins, h).toBe(true);
      for (const o of planSlot(slot, ctx).orders) {
        const p = horaLocal(new Date(o.pickup_at));
        expect((p >= "12:30" && p < "16:00") || (p >= "19:30" && p < "22:30"), p).toBe(true);
      }
    }
  });

  it("les comandes de plataforma no tenen client ni segell", () => {
    let plataformes = 0;
    for (const slot of setmana("2026-10-19", ctx)) {
      for (const o of planSlot(slot, ctx).orders) {
        if (o.channel !== "plataforma") continue;
        plataformes++;
        expect(o.customer_id).toBeNull();
        expect(o.scan).toBe(false);
      }
    }
    expect(plataformes).toBeGreaterThan(0);
  });

  it("cap plat fora de temporada", () => {
    const tardor = new Set(plats.filter((p) => p.season === "tardor").map((p) => p.id));
    const abans = addDays(SIM_TARDOR.from, -10); // setembre, abans de la tardor
    let venuts = 0;
    for (let d = 0; d < 16; d++) {
      for (const slot of frangesDia(addDays(abans, d), ctx.holidays)) {
        for (const o of planSlot(slot, ctx).orders) {
          for (const i of o.items) {
            if (slot.day < SIM_TARDOR.from) expect(tardor.has(i.dish_id), slot.day).toBe(false);
            else if (tardor.has(i.dish_id)) venuts++;
          }
        }
      }
    }
    expect(venuts).toBeGreaterThan(0); // a partir de l'alta, sí que se'n venen
  });
});
