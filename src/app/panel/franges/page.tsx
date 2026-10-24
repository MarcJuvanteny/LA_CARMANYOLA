import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DIES, FRANGES, franges } from "@/lib/db/panel";
import { FrangesView } from "./FrangesView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("franges") };
}

export default async function FrangesPage() {
  const f = await franges();
  return (
    <FrangesView
      dies={[...DIES]}
      franges={[...FRANGES]}
      comandes={f.matriu}
      fluixes={f.fluixes}
      previsio={f.previsio}
      proposta={f.proposta}
    />
  );
}
