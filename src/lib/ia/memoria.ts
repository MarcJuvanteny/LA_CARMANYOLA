import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { serviceClient } from "@/lib/sim/db";
import { iaDisponible, type Redaccio } from "./gemini";

// Memòria de la IA (taula ai_texts). Les targetes del panell no esperen el model:
// - si ja hi ha un text redactat per a aquestes mateixes dades, es mostra;
// - si no, es mostra la plantilla (amb els números bons) i la IA el redacta en segon pla.
// Així el panell va igual de ràpid i la quota gratuïta només es gasta quan les dades canvien.

/** Puja-ho quan canviïn els prompts: força que es tornin a redactar tots els textos. */
const VERSIO = "1";
/** Si les dades canvien molt sovint (vendes d'avui), no es torna a redactar més d'un cop cada… */
const ESPERA_MS = 15 * 60_000;
/** Temps que una instància es reserva una clau mentre redacta (2 models × 45 s, i marge). */
const RESERVA_S = 120;

// Primer filtre dins del mateix procés; la reserva a la base de dades cobreix les altres instàncies.
const enCurs = new Set<string>();

/** Reserva `clau` a totes les instàncies. Si la migració no hi és o falla, deixa passar (com abans). */
async function reserva(db: ReturnType<typeof serviceClient>, clau: string): Promise<boolean> {
  const { data, error } = await db.rpc("ia_reserva", { p_clau: clau, p_segons: RESERVA_S });
  if (error) {
    console.warn("[ia] sense reserva:", error.message.slice(0, 120));
    return true;
  }
  return data === true;
}

const resum = (x: unknown) => createHash("sha256").update(VERSIO + JSON.stringify(x)).digest("hex").slice(0, 32);

export interface AmbIA<T> {
  valor: T;
  font: "ia" | "plantilla";
}

export async function ambIA<T>(clau: string, entrada: unknown, plantilla: T, genera: () => Promise<Redaccio<T> | null>): Promise<AmbIA<T>> {
  if (!iaDisponible()) return { valor: plantilla, font: "plantilla" };
  const hash = resum(entrada);
  const db = serviceClient();
  const { data } = await db.from("ai_texts").select("input_hash, content, created_at").eq("key", clau).maybeSingle();
  if (data?.input_hash === hash) return { valor: data.content as T, font: "ia" };

  const recent = data && Date.now() - new Date(data.created_at).getTime() < ESPERA_MS;
  if (!recent && !enCurs.has(clau)) {
    enCurs.add(clau);
    after(async () => {
      try {
        if (!(await reserva(db, clau))) return;
        const r = await genera();
        if (r) {
          await db.from("ai_texts").upsert({ key: clau, input_hash: hash, content: r.valor, model: r.model, created_at: new Date().toISOString() });
        }
      } finally {
        enCurs.delete(clau);
      }
    });
  }
  return { valor: plantilla, font: "plantilla" };
}
