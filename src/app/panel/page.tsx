import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { campanyes, carnet, padro, queQueda, vendes } from "@/lib/db/panel";
import { ResumView } from "./ResumView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel.nav");
  return { title: t("resum") };
}

export default async function ResumPage() {
  const [avui, setmana, qq, pd, cb, camps] = await Promise.all([vendes("avui"), vendes("setmana"), queQueda(), padro(), carnet(), campanyes()]);
  const titol = (slug: string) => camps.campanyes.find((c) => c.id === slug)?.titol ?? slug;
  const avis = (id: string) => pd.avisos.find((a) => a.id === id)?.titol ?? id;

  const propostes = [
    { id: "campanya:recupera-habituals", seccio: "campanyes", titol: titol("recupera-habituals"), href: "/panel/campanyes?c=recupera-habituals" },
    { id: "campanya:segell-doble", seccio: "franges", titol: titol("segell-doble"), href: "/panel/franges" },
    { id: "campanya:carxofa", seccio: "campanyes", titol: titol("carxofa"), href: "/panel/campanyes?c=carxofa" },
    { id: "padro:alta-carxofa", seccio: "padro", titol: avis("alta-carxofa"), href: "/panel/padro" },
    { id: "padro:baixa-tomaquet", seccio: "padro", titol: avis("baixa-tomaquet"), href: "/panel/padro" },
    { id: "quequeda:avis", seccio: "queQueda", titol: `Obre l'hora del Què Queda a les ${qq.ara.hora}`, href: "/panel/que-queda" },
    { id: "vendes:produccio", seccio: "vendes", titol: `Ajusta la ${qq.produccio.titol.charAt(0).toLowerCase()}${qq.produccio.titol.slice(1)}`, href: "/panel/que-queda" },
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
