import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { exemplePrevisualitzacio } from "@/lib/data/campanyes";
import { campanyes } from "@/lib/db/panel";
import { CampanyesView } from "./CampanyesView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("campanyes") };
}

export default async function CampanyesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const [{ c }, dades] = await Promise.all([searchParams, campanyes()]);
  const inicial = dades.campanyes.some((x) => x.id === c) ? c! : (dades.campanyes[0]?.id ?? "");
  return <CampanyesView campanyes={dades.campanyes} peticions={dades.peticions} inicial={inicial} exemple={exemplePrevisualitzacio} />;
}
