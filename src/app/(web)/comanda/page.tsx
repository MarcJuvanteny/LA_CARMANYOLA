import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComandaView } from "./ComandaView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("web.comanda");
  return { title: t("titol"), robots: { index: false } };
}

export default function ComandaPage() {
  return <ComandaView />;
}
