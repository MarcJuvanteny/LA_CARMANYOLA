import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// La base de dades i `after` de Next es fan en memòria: cap crida real a Supabase ni a Gemini.
const bd = vi.hoisted(() => ({
  fila: null as null | { input_hash: string; content: unknown; created_at: string },
  reserva: true as boolean | null,
  upserts: [] as unknown[],
  rpcs: [] as string[],
}));

vi.mock("@/lib/sim/db", () => ({
  serviceClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: bd.fila }) }) }),
      upsert: async (x: unknown) => (bd.upserts.push(x), { error: null }),
    }),
    rpc: async (fn: string) => {
      bd.rpcs.push(fn);
      return bd.reserva === null ? { data: null, error: { message: "no existeix" } } : { data: bd.reserva, error: null };
    },
  }),
}));
vi.mock("next/server", () => ({ after: (f: () => Promise<void>) => void f() }));

import { conservaVariables, esCampanya, esMissatges, fetsNegoci } from "./campanyes";
import { netejaText } from "./gemini";
import { ambIA } from "./memoria";
import { esTargeta } from "./prompts";
import { gastaQuota } from "./quota";
import { fetsClients } from "./targetes";

const idiomes = (t: string) => ({ ca: t, es: t, en: t });
const missatges = (t: string) => ({ original: idiomes(t), curt: idiomes(t), calid: idiomes(t), senseExtra: idiomes(t) });

describe("netejaText", () => {
  it("treu vinyetes, cometes i subratllats però deixa les negretes", () => {
    expect(netejaText('"- Hola **12** __clients__"')).toBe("Hola **12** clients");
    expect(netejaText("• u\n* dos")).toBe("u\ndos");
  });
});

describe("validadors de les respostes del model", () => {
  it("esTargeta", () => {
    expect(esTargeta({ titol: "T", punts: ["a", "b"] })).toBe(true);
    expect(esTargeta({ titol: "T", punts: [1] })).toBe(false);
    expect(esTargeta({ punts: [] })).toBe(false);
    expect(esTargeta(null)).toBe(false);
  });

  it("esMissatges exigeix els 4 tons en els 3 idiomes", () => {
    expect(esMissatges(missatges("x"))).toBe(true);
    const { calid: _, ...senseCalid } = missatges("x");
    expect(esMissatges(senseCalid)).toBe(false);
    expect(esMissatges({ ...missatges("x"), curt: { ca: "x", es: "x" } })).toBe(false);
  });

  it("esCampanya rebutja tipus, dies o hores fora de lloc", () => {
    const bona = { tipus: "franja", segment: "tots", titol: "T", perQue: ["a", "b"], etiquetaSenseExtra: "e", dia: 2, hora: "11:30", motiuHora: "m", missatges: missatges("x") };
    expect(esCampanya(bona)).toBe(true);
    expect(esCampanya({ ...bona, tipus: "descompte" })).toBe(false);
    expect(esCampanya({ ...bona, hora: "a les 11" })).toBe(false);
    expect(esCampanya({ ...bona, dia: 2.5 })).toBe(false);
  });
});

describe("conservaVariables", () => {
  it("no deixa inventar variables", () => {
    expect(conservaVariables(missatges("Hola {nom}, {descompte}"), null)).toBe(false);
  });
  it("si el missatge duia {nom}, l'han de dur tots els tons", () => {
    const model = missatges("Hola {nom}");
    expect(conservaVariables(missatges("Hola {nom}!"), model)).toBe(true);
    expect(conservaVariables({ ...missatges("Hola {nom}"), curt: idiomes("Hola") }, model)).toBe(false);
  });
  it("si duia {paraula}, almenys la versió principal", () => {
    const model = missatges("{nom}, et falta {paraula}");
    expect(conservaVariables({ ...missatges("{nom}, et falta {paraula}"), curt: idiomes("{nom}, vine") }, model)).toBe(true);
    expect(conservaVariables(missatges("{nom}, vine"), model)).toBe(false);
  });
});

describe("dades que arriben a la IA (CONTEXT.md §9.5)", () => {
  const clients = [
    { nom: "Montserrat P.", segments: ["tots", "risc"], platPreferit: "Fricandó amb Bolets", senseVenir: 30, comandes: 4, paraules: 6, laborables: 3, wallet: true },
    { nom: "Jordi G.", segments: ["tots", "risc"], platPreferit: "La de Sempre", senseVenir: 20, comandes: 1, paraules: 2, laborables: 0, wallet: false },
  ] as unknown as Parameters<typeof fetsClients>[1];

  it("els fets de clients són agregats i no duen cap nom", () => {
    const fets = fetsClients("risc", clients)!.join("\n");
    expect(fets).toContain("Són 2 de 2");
    expect(fets).not.toMatch(/Montserrat|Jordi/);
  });

  it("els fets del negoci tampoc", () => {
    const fets = fetsNegoci(
      [
        { risc: true, wallet: true, consentiment: false, paraules: 6 },
        { risc: false, wallet: false, consentiment: true, paraules: 1 },
      ],
      { mitjanaFluixes: 3, mitjanaMigdia: 14 },
      [{ nom: "La de Sempre", disponible: true, seccio: "casa" }],
    ).join("\n");
    expect(fets).toContain("Clients en risc: 1");
    expect(fets).toContain("La de Sempre");
  });
});

describe("ambIA", () => {
  const genera = vi.fn(async () => ({ valor: "redactat", model: "m" }));

  beforeEach(() => {
    bd.fila = null;
    bd.reserva = true;
    bd.upserts = [];
    bd.rpcs = [];
    genera.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sense clau, plantilla i res més", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await ambIA("k", { a: 1 }, "plantilla", genera)).toEqual({ valor: "plantilla", font: "plantilla" });
    expect(genera).not.toHaveBeenCalled();
  });

  it("primer cop: plantilla ara i redacció en segon pla, amb reserva", async () => {
    vi.stubEnv("GEMINI_API_KEY", "x");
    expect((await ambIA("k1", { a: 1 }, "plantilla", genera)).font).toBe("plantilla");
    await vi.waitFor(() => expect(bd.upserts).toHaveLength(1));
    expect(bd.rpcs).toContain("ia_reserva");
  });

  it("si una altra instància ja l'està redactant, no la torna a demanar", async () => {
    vi.stubEnv("GEMINI_API_KEY", "x");
    bd.reserva = false;
    await ambIA("k2", { a: 1 }, "plantilla", genera);
    await vi.waitFor(() => expect(bd.rpcs).toContain("ia_reserva"));
    expect(genera).not.toHaveBeenCalled();
  });

  it("sense la migració de reserves, continua funcionant", async () => {
    vi.stubEnv("GEMINI_API_KEY", "x");
    bd.reserva = null;
    await ambIA("k3", { a: 1 }, "plantilla", genera);
    await vi.waitFor(() => expect(genera).toHaveBeenCalledTimes(1));
  });

  it("amb el text desat per a les mateixes dades, el fa servir", async () => {
    vi.stubEnv("GEMINI_API_KEY", "x");
    await ambIA("k4", { a: 1 }, "plantilla", genera);
    await vi.waitFor(() => expect(bd.upserts).toHaveLength(1));
    const { input_hash } = bd.upserts[0] as { input_hash: string };
    bd.fila = { input_hash, content: "desat", created_at: new Date().toISOString() };
    expect(await ambIA("k4", { a: 1 }, "plantilla", genera)).toEqual({ valor: "desat", font: "ia" });
  });
});

describe("gastaQuota", () => {
  it("respecta el que diu la base de dades", async () => {
    bd.reserva = false;
    expect(await gastaQuota("veu")).toBe(false);
    bd.reserva = true;
    expect(await gastaQuota("veu")).toBe(true);
  });
  it("si la funció no existeix, deixa passar", async () => {
    bd.reserva = null;
    expect(await gastaQuota("veu")).toBe(true);
  });
});
