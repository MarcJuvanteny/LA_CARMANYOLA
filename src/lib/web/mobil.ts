/** El mòbil en un sol format: +34 i nou xifres per als d'aquí; els de fora, amb el seu prefix. */
export function normalitzaMobil(text: string): string | null {
  let n = text.replace(/[\s.\-()]/g, "");
  if (n.startsWith("00")) n = `+${n.slice(2)}`;
  if (/^[67]\d{8}$/.test(n)) n = `+34${n}`;
  return /^\+\d{8,15}$/.test(n) ? n : null;
}
