import { describe, expect, it } from "vitest";
import { momentProgramat } from "./enviaments";

describe("momentProgramat", () => {
  // Dijous 12 de novembre del 2026, 10:00 a Barcelona (09:00 UTC).
  const ara = new Date("2026-11-12T09:00:00Z");

  it("una data ISO i una hora són hora de Barcelona", () => {
    expect(momentProgramat("2026-11-20", "10:00", ara)?.toISOString()).toBe("2026-11-20T09:00:00.000Z");
  });

  it("un dia de la setmana és el proper (5 = divendres; el mateix dia, la setmana vinent)", () => {
    expect(momentProgramat("5", "11:30", ara)?.toISOString()).toBe("2026-11-13T10:30:00.000Z");
    // Igual que la data de la previsualització del panell (properDia).
    expect(momentProgramat("4", "11:30", ara)?.toISOString()).toBe("2026-11-19T10:30:00.000Z");
  });

  it("sense data o amb una hora rara, no es programa", () => {
    expect(momentProgramat(null, "10:00", ara)).toBeNull();
    expect(momentProgramat("2026-11-20", null, ara)).toBeNull();
    expect(momentProgramat("2026-11-20", "a les deu", ara)).toBeNull();
  });
});
