import "server-only";
import { serviceClient } from "@/lib/sim/db";

/** El que mostra la targeta del wallet (CONTEXT.md §5): nom, X de 8, la paraula que falta i carnets completats. */
export interface Carnet {
  id: string;
  nom: string;
  paraules: number;
  falta: string | null;
  complets: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function carnet(id: string): Promise<Carnet | null> {
  if (!UUID.test(id)) return null;
  const db = serviceClient();
  const [client, segells, premis, paraules] = await Promise.all([
    db.from("customers").select("first_name").eq("id", id).eq("simulated", false).maybeSingle(),
    db.from("stamps").select("word_id, card_number").eq("customer_id", id),
    db.from("rewards").select("id", { count: "exact", head: true }).eq("customer_id", id),
    db.from("words").select("id, from_word, to_word").order("id"),
  ]);
  if (!client.data) return null;

  const llista = segells.data ?? [];
  const actual = Math.max(1, ...llista.map((s) => s.card_number));
  const fetes = new Set(llista.filter((s) => s.card_number === actual).map((s) => s.word_id));
  const falta = (paraules.data ?? []).find((w) => !fetes.has(w.id) && w.to_word);

  return {
    id,
    nom: client.data.first_name,
    paraules: fetes.size === 8 ? 0 : fetes.size,
    falta: falta ? `${falta.from_word} → ${falta.to_word}` : null,
    complets: premis.count ?? 0,
  };
}
