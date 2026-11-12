import { describe, expect, it } from "vitest";
import { nutricioValida } from "./carta";

const completa = { grams: 450, kcal: 620, greixos: 22, saturats: 6.5, hidrats: 70, sucres: 8, proteines: 30, sal: 2.1 };

describe("nutricioValida", () => {
  it("accepta els vuit valors", () => {
    expect(nutricioValida(completa)).toEqual(completa);
  });

  it("si en falta algun, o n'hi ha de negatius o de text, no es mostra", () => {
    const { sal: _sal, ...senseSal } = completa;
    expect(nutricioValida(senseSal)).toBeUndefined();
    expect(nutricioValida({ ...completa, kcal: -1 })).toBeUndefined();
    expect(nutricioValida({ ...completa, kcal: "620" })).toBeUndefined();
    expect(nutricioValida(null)).toBeUndefined();
  });
});
