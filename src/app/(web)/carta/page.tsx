import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { seccions, type Idioma } from "@/lib/data/carta";
import { cartaPublica } from "@/lib/db/web";
import { carmanyoles, platWeb } from "@/lib/web/contingut";
import { CartaView } from "./CartaView";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("web.carta");
  return { title: t("titol") };
}

export default async function CartaPage() {
  const carta = await cartaPublica();
  const idioma = (await getLocale()) as Idioma;
  const plats = [...carmanyoles(carta, idioma), ...carta.filter((p) => p.seccio !== "casa").map((p) => platWeb(p, idioma))];
  return <CartaView plats={plats} seccions={seccions} />;
}
