// Formatadors deterministes (mateix resultat al servidor i al navegador).

function agrupa(enter: number): string {
  return Math.abs(enter)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Cèntims → "12,50 €". Amb `senseDecimals`, arrodoneix: "6.023 €". */
export function euros(centims: number, { senseDecimals = false } = {}): string {
  const signe = centims < 0 ? "−" : "";
  const abs = Math.abs(centims);
  if (senseDecimals) return `${signe}${agrupa(Math.round(abs / 100))} €`;
  const enter = Math.floor(abs / 100);
  const dec = String(abs % 100).padStart(2, "0");
  return `${signe}${agrupa(enter)},${dec} €`;
}

/** 1234 → "1.234" */
export function nombre(n: number): string {
  return `${n < 0 ? "−" : ""}${agrupa(Math.round(n))}`;
}

/** 0.38 → "38 %"; amb signe: "+6 %" / "−2 %" */
export function percent(fraccio: number, { signe = false } = {}): string {
  const v = Math.round(fraccio * 100);
  const pre = signe ? (v > 0 ? "+" : v < 0 ? "−" : "") : v < 0 ? "−" : "";
  return `${pre}${Math.abs(v)} %`;
}
