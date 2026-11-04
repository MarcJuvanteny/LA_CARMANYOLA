import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CarnetView } from "./CarnetView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("web.carnet");
  return { title: t("titol"), description: t("text") };
}

export default function CarnetPage() {
  return <CarnetView />;
}
