import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { campanyes, carnet, padro, queQueda, vendes } from "@/lib/db/panel";
import { ResumView } from "./ResumView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("resum") };
}

export default async function ResumPage() {
  const t = await getTranslations("panel.resum");
  const [avui, setmana, qq, pd, cb, camps] = await Promise.all([vendes("avui"), vendes("setmana"), queQueda(), padro(), carnet(), campanyes()]);
  const titol = (slug: string) => camps.campanyes.find((c) => c.id === slug)?.titol ?? slug;
  const avis = (id: string) => pd.avisos.find((a) => a.id === id)?.titol ?? id;

  const propostes = [
    { id: "campanya:recupera-habituals", seccio: "campanyes", titol: titol("recupera-habituals"), href: "/panel/campanyes?c=recupera-habituals" },
    { id: "campanya:carxofa", seccio: "campanyes", titol: titol("carxofa"), href: "/panel/campanyes?c=carxofa" },
    { id: "padro:alta-carxofa", seccio: "padro", titol: avis("alta-carxofa"), href: "/panel/padro#ia" },
    { id: "padro:baixa-tomaquet", seccio: "padro", titol: avis("baixa-tomaquet"), href: "/panel/padro#ia" },
    { id: "quequeda:avis", seccio: "carta", titol: t("obreQueQueda", { hora: qq.ara.hora }), href: "/panel/carta#que-queda" },
    { id: "vendes:produccio", seccio: "vendes", titol: t("ajustaProduccio"), href: "/panel/vendes#ia" },
  ];

  return (
    <ResumView
      avui={avui}
      setmana={setmana}
      ara={qq.ara}
      queden={qq.plats.filter((p) => p.previsio > 0)}
      empadronats={pd.ingredients.filter((i) => i.estat === "empadronat")}
      carnet={cb}
      propostes={propostes}
    />
  );
}
