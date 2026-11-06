import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verificaWebhook } from "@/lib/pagaments/stripe";
import { comprovaSignatura, signa } from "@/lib/signatura";
import { CistellaNoValida, validaCistella, type DadesPlat } from "./cistella";

const carta: DadesPlat[] = [
  { id: 1, slug: "la-de-sempre", name: "La de Sempre", section: "casa", price_cents: 1150, available: true },
  { id: 2, slug: "fes-te-l-tu", name: "Fes-te'l tu", section: "fes", price_cents: 1390, available: true },
  { id: 3, slug: "crema-catalana", name: "Crema catalana", section: "postres", price_cents: 350, available: true },
  { id: 4, slug: "aigua", name: "Aigua", section: "begudes", price_cents: 80, available: true },
  { id: 5, slug: "l-esqueixat", name: "L'Esqueixat", section: "casa", price_cents: 1250, available: false },
];

describe("validaCistella", () => {
  it("posa els preus de la base de dades, no els del navegador", () => {
    const r = validaCistella([{ slug: "la-de-sempre", quantitat: 2 }], carta);
    expect(r.total).toBe(2300);
    expect(r.linies[0]).toMatchObject({ nom: "La de Sempre", preu: 1150, quantitat: 2 });
  });

  it("El Dinar suma 2 € i l'acompanyament va a 0", () => {
    const r = validaCistella([{ slug: "la-de-sempre", quantitat: 1, dinar: "crema-catalana" }], carta);
    expect(r.total).toBe(1350);
    expect(r.items).toEqual([
      { dish_id: 1, qty: 1, unit_price_cents: 1150, detail: null },
      { dish_id: 3, qty: 1, unit_price_cents: 0, detail: "El Dinar" },
    ]);
  });

  it("El Dinar només amb les opcions permeses", () => {
    expect(() => validaCistella([{ slug: "la-de-sempre", quantitat: 1, dinar: "aigua" }], carta)).toThrow(CistellaNoValida);
    expect(() => validaCistella([{ slug: "crema-catalana", quantitat: 1, dinar: "crema-catalana" }], carta)).toThrow(CistellaNoValida);
  });

  it("Fes-te'l tu: 1 principal, 1 base i 3 complements, amb suplements", () => {
    const r = validaCistella([{ slug: "fes-te-l-tu", quantitat: 1, opcions: ["bacalla", "arros", "pebrot", "olives", "formatge"] }], carta);
    expect(r.total).toBe(1390 + 150 + 100);
    expect(r.linies[0].detall).toContain("Bacallà esqueixat");
    expect(() => validaCistella([{ slug: "fes-te-l-tu", quantitat: 1, opcions: ["bacalla", "arros", "pebrot"] }], carta)).toThrow(CistellaNoValida);
    expect(() => validaCistella([{ slug: "fes-te-l-tu", quantitat: 1, opcions: ["inventat", "arros", "pebrot", "olives", "ceba"] }], carta)).toThrow(CistellaNoValida);
  });

  it("rebutja plats no disponibles, quantitats absurdes i cistelles buides", () => {
    expect(() => validaCistella([{ slug: "l-esqueixat", quantitat: 1 }], carta)).toThrow(CistellaNoValida);
    expect(() => validaCistella([{ slug: "la-de-sempre", quantitat: 0 }], carta)).toThrow(CistellaNoValida);
    expect(() => validaCistella([{ slug: "la-de-sempre", quantitat: 500 }], carta)).toThrow(CistellaNoValida);
    expect(() => validaCistella([], carta)).toThrow(CistellaNoValida);
  });
});

describe("verificaWebhook", () => {
  const secret = "whsec_prova";
  const cos = JSON.stringify({ type: "checkout.session.completed" });
  const ara = 1_800_000_000_000;
  const t = Math.floor(ara / 1000);
  const firma = createHmac("sha256", secret).update(`${t}.${cos}`).digest("hex");

  it("accepta una signatura bona", () => {
    expect(verificaWebhook(cos, `t=${t},v1=${firma}`, secret, ara)).toBe(true);
  });
  it("rebutja cos canviat, secret dolent i esdeveniments vells", () => {
    expect(verificaWebhook(cos + " ", `t=${t},v1=${firma}`, secret, ara)).toBe(false);
    expect(verificaWebhook(cos, `t=${t},v1=${firma}`, "whsec_altre", ara)).toBe(false);
    expect(verificaWebhook(cos, `t=${t},v1=${firma}`, secret, ara + 10 * 60_000)).toBe(false);
    expect(verificaWebhook(cos, null, secret, ara)).toBe(false);
  });
});

describe("signatura", () => {
  it("el token de baixa només val per al seu client", () => {
    process.env.TOKENS_SECRET = "prova";
    const tok = signa("baixa", "client-a");
    expect(comprovaSignatura("baixa", "client-a", tok)).toBe(true);
    expect(comprovaSignatura("baixa", "client-b", tok)).toBe(false);
    expect(comprovaSignatura("wallet-apple", "client-a", tok)).toBe(false);
  });
});
