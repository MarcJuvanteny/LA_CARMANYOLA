import "server-only";
import { serviceClient } from "@/lib/sim/db";

// Límit de les accions de la IA sota demanda (botons del panell): evita que uns quants clics
// seguits es mengin la quota gratuïta del model. Les targetes en segon pla no compten (ja tenen memòria).

/** Crides sota demanda permeses per finestra. Es pot canviar amb IA_QUOTA_HORA. */
const MAXIM = Number(process.env.IA_QUOTA_HORA) || 30;
const FINESTRA_MIN = 60;

export type AccioIA = "veu" | "que-queda" | "campanya-reescriu" | "campanya-nova";

/** true si encara queda quota (i la gasta). Si la migració no hi és o la base de dades falla, deixa passar. */
export async function gastaQuota(accio: AccioIA): Promise<boolean> {
  try {
    const { data, error } = await serviceClient().rpc("ia_quota", { p_accio: accio, p_maxim: MAXIM, p_minuts: FINESTRA_MIN });
    if (error) {
      console.warn("[ia] quota no disponible:", error.message.slice(0, 120));
      return true;
    }
    if (data !== true) console.warn(`[ia] quota exhaurida (${MAXIM}/h): ${accio}`);
    return data === true;
  } catch (e) {
    console.warn("[ia] quota no disponible:", e instanceof Error ? e.message.slice(0, 120) : e);
    return true;
  }
}
