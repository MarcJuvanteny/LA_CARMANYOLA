import "server-only";
import { simulateUntil } from "./catchup";
import { serviceClient } from "./db";

/**
 * Pla B del cron: en obrir el panell, omple les franges pendents. Com que la simulació és
 * determinista i sim_runs evita duplicats, el resultat és el mateix que si ho hagués fet el cron.
 */
let darrera = 0;
let enMarxa: Promise<unknown> | null = null;

export async function posaAlDiaEnSegonPla() {
  if (enMarxa || Date.now() - darrera < 60_000) return;
  darrera = Date.now();
  enMarxa = simulateUntil(serviceClient())
    .catch((e) => console.error("Pla B del simulador:", e))
    .finally(() => (enMarxa = null));
  await enMarxa;
}
