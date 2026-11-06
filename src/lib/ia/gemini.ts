import "server-only";
import { GoogleGenAI } from "@google/genai";

// Únic punt de contacte amb el model (CONTEXT.md §9). Els números ja arriben calculats;
// aquí només es redacta. Si no hi ha clau o el model falla, retorna null i qui crida
// fa servir les plantilles de sempre: el panell no es queda mai buit.

/** Models per ordre de preferència. Es poden canviar amb GEMINI_MODELS="model-a,model-b". */
const MODELS = (process.env.GEMINI_MODELS ?? "gemini-3.5-flash,gemini-flash-lite-latest")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const TEMPS_MAXIM_MS = 45_000;

let client: GoogleGenAI | null = null;
function gemini() {
  if (!process.env.GEMINI_API_KEY) return null;
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export const iaDisponible = () => Boolean(process.env.GEMINI_API_KEY);

export interface Redaccio<T = string> {
  valor: T;
  model: string;
}

async function crida(sistema: string, peticio: string, esquema?: object): Promise<{ text: string; model: string } | null> {
  const ai = gemini();
  if (!ai) return null;
  for (const model of MODELS) {
    try {
      const r = await ai.models.generateContent({
        model,
        contents: peticio,
        config: {
          systemInstruction: sistema,
          httpOptions: { timeout: TEMPS_MAXIM_MS },
          ...(esquema && { responseMimeType: "application/json", responseJsonSchema: esquema }),
        },
      });
      const text = r.text?.trim();
      if (text) return { text, model: r.modelVersion ?? model };
    } catch (e) {
      // Saturat (503), límit gratuït (429) o model retirat (404): es prova el següent.
      console.warn(`[ia] ${model} ha fallat:`, e instanceof Error ? e.message.slice(0, 160) : e);
    }
  }
  return null;
}

/** Redacta un text lliure amb `sistema` com a instruccions i `peticio` com a encàrrec. */
export async function redacta(sistema: string, peticio: string): Promise<Redaccio | null> {
  const r = await crida(sistema, peticio);
  return r && { valor: r.text, model: r.model };
}

/** Com `redacta`, però la resposta ha de complir l'esquema JSON i `valida` la comprova abans d'acceptar-la. */
export async function redactaJson<T>(sistema: string, peticio: string, esquema: object, valida: (x: unknown) => x is T): Promise<Redaccio<T> | null> {
  const r = await crida(sistema, peticio, esquema);
  if (!r) return null;
  try {
    const valor: unknown = JSON.parse(r.text);
    if (valida(valor)) return { valor, model: r.model };
    console.warn("[ia] resposta amb un format inesperat");
  } catch {
    console.warn("[ia] resposta que no és JSON");
  }
  return null;
}

/** Treu el markdown que el panell no fa servir (deixa les **negretes**, que sí es mostren). */
export const netejaText = (s: string) =>
  s.trim().replace(/^["«“]|["»”]$/g, "").replace(/__/g, "").replace(/^\s*[-*•]\s+/gm, "").trim();
