import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DIES, FRANGES, franges, vendes } from "@/lib/db/panel";
import { VendesView } from "./VendesView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("vendes") };
}

export default async function VendesPage() {
  const [avui, setmana, mes, f] = await Promise.all([vendes("avui"), vendes("setmana"), vendes("mes"), franges()]);
  return (
    <VendesView
      dades={{ avui, setmana, mes }}
      franges={{ dies: [...DIES], franges: [...FRANGES], comandes: f.matriu, fluixes: f.fluixes, previsio: f.previsio, proposta: f.proposta }}
    />
  );
}
