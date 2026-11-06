import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SUPLEMENT_DINAR, seccions } from "@/lib/data/carta";
import { carta, queQueda } from "@/lib/db/panel";
import { CartaView } from "./CartaView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("carta") };
}

export default async function CartaPage() {
  const [plats, qq] = await Promise.all([carta(), queQueda()]);
  return (
    <CartaView
      plats={plats}
      seccions={seccions}
      suplementDinar={SUPLEMENT_DINAR}
      queQueda={{ ara: qq.ara, plats: qq.plats, proposta: qq.proposta, avis: qq.avis }}
    />
  );
}
