import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SUPLEMENT_DINAR, seccions } from "@/lib/data/carta";
import { carta } from "@/lib/db/panel";
import { CartaView } from "./CartaView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("carta") };
}

export default async function CartaPage() {
  return <CartaView plats={await carta()} seccions={seccions} suplementDinar={SUPLEMENT_DINAR} />;
}
