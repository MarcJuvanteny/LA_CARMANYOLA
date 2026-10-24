import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { queQueda } from "@/lib/db/panel";
import { QueQuedaView } from "./QueQuedaView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("queQueda") };
}

export default async function QueQuedaPage() {
  const d = await queQueda();
  return <QueQuedaView ara={d.ara} plats={d.plats} proposta={d.proposta} produccio={d.produccio} avis={d.avis} />;
}
