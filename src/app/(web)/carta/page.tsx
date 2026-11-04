import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { seccions } from "@/lib/data/carta";
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
  const plats = [...carmanyoles(carta), ...carta.filter((p) => p.seccio !== "casa").map(platWeb)];
  return <CartaView plats={plats} seccions={seccions} />;
}
