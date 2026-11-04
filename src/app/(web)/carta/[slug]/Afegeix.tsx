"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCistella } from "@/components/web/Cistella";
import { SUPLEMENT_DINAR } from "@/lib/data/carta";
import { euros } from "@/lib/format";

interface Props {
  plat: { slug: string; nom: string; preu: number; disponible: boolean };
  dinar: { slug: string; nom: string }[];
}

/** El Dinar, la quantitat i el botó d'afegir. Al mòbil, la barra queda enganxada a baix. */
export function Afegeix({ plat, dinar }: Props) {
  const t = useTranslations("web.fitxa");
  const tc = useTranslations("web.carta");
  const { afegeix } = useCistella();
  const [opcio, setOpcio] = useState<string>("");
  const [quantitat, setQuantitat] = useState(1);
  const [fet, setFet] = useState(false);

  const triat = dinar.find((d) => d.slug === opcio);
  const total = (plat.preu + (triat ? SUPLEMENT_DINAR : 0)) * quantitat;
  // Qualsevol canvi torna a mostrar el botó d'afegir.
  const tria = (slug: string) => {
    setOpcio(slug);
    setFet(false);
  };
  const suma = (n: number) => {
    setQuantitat((q) => Math.max(1, q + n));
    setFet(false);
  };

  return (
    <>
      {dinar.length > 0 && (
        <fieldset className="m-0 flex flex-col rounded-[20px] border-0 bg-white px-[18px] pt-[18px] pb-2">
          <legend className="font-titol float-left w-full pb-1.5 text-base">
            {t("dinar")} <span className="text-sm">· +{euros(SUPLEMENT_DINAR)}</span>
          </legend>
          {[{ slug: "", nom: "" }, ...dinar].map((d, i) => (
            <label key={d.slug} className={`flex min-h-11 cursor-pointer items-center gap-3 text-sm ${i < dinar.length ? "border-b border-[#F0E8DA]" : ""}`}>
              <input type="radio" name="dinar" checked={opcio === d.slug} onChange={() => tria(d.slug)} className="size-[18px] accent-granat" />
              {d.slug ? t("amb", { nom: d.nom.toLowerCase() }) : t("nomesCarmanyola")}
            </label>
          ))}
        </fieldset>
      )}

      <div className="sticky bottom-0 z-20 -mx-5 flex items-center gap-3 border-t border-linia bg-paper px-4 pt-3.5 pb-6 md:static md:mx-0 md:border-0 md:px-0">
        <div className="flex items-center rounded-full border border-linia bg-white">
          <button type="button" aria-label={t("treu")} onClick={() => suma(-1)} className="size-11 cursor-pointer border-0 bg-transparent text-xl text-tinta">
            −
          </button>
          <span className="min-w-[18px] text-center font-medium" aria-live="polite">
            {quantitat}
          </span>
          <button type="button" aria-label={t("posa")} onClick={() => suma(1)} className="size-11 cursor-pointer border-0 bg-transparent text-xl text-tinta">
            +
          </button>
        </div>
        {fet ? (
          <Link href="/comanda" className="flex-1 rounded-full bg-tinta p-4 text-center text-[13px] font-medium tracking-[.06em] text-paper uppercase no-underline">
            {t("afegit")} · {t("veureComanda")}
          </Link>
        ) : (
          <button
            type="button"
            disabled={!plat.disponible}
            onClick={() => {
              afegeix({ slug: plat.slug, nom: plat.nom, preu: plat.preu, dinar: triat }, quantitat);
              setFet(true);
            }}
            className="flex-1 cursor-pointer rounded-full border-0 bg-granat p-4 text-center text-[13px] font-medium tracking-[.06em] text-paper uppercase disabled:cursor-not-allowed disabled:bg-linia disabled:text-suau"
          >
            {plat.disponible ? t("afegeix", { preu: euros(total) }) : tc("noDisponible")}
          </button>
        )}
      </div>
    </>
  );
}
