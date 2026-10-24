import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { padro } from "@/lib/db/panel";
import { PadroView } from "./PadroView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("padro") };
}

export default async function PadroPage() {
  const { ingredients, avisos } = await padro();
  return <PadroView ingredients={ingredients} avisos={avisos} />;
}
