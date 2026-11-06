import { getLocale } from "next-intl/server";
import type { Idioma } from "@/lib/data/carta";
import { cartaPublica } from "@/lib/db/web";
import { carmanyoles } from "@/lib/web/contingut";
import { Inici } from "./Inici";

// La carta la pot canviar l'amo des del panell: es torna a llegir cada cinc minuts.
export const revalidate = 300;

export default async function IniciPage() {
  const carta = await cartaPublica();
  const feste = carta.find((p) => p.seccio === "fes");
  return <Inici plats={carmanyoles(carta, (await getLocale()) as Idioma).filter((p) => p.disponible)} preuFeste={feste?.preu ?? 1390} />;
}
