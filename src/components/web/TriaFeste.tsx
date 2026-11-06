"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { euros } from "@/lib/format";
import { alergensFeste, deGrup, detallFeste, grups, ingredients, preuFeste, quants, type Grup } from "@/lib/web/feste";
import { useCistella } from "./Cistella";

/** El Fes-te'l tu en un popup: principal, base i tres complements. En confirmar, va a la cistella i es tanca. */
export function TriaFeste({ obert, tanca, plat }: { obert: boolean; tanca: () => void; plat: { slug: string; nom: string; preu: number } }) {
  const t = useTranslations("web.feste");
  const { afegeix } = useCistella();
  const dialeg = useRef<HTMLDialogElement>(null);
  const [ids, setIds] = useState<string[]>([]);

  // <dialog> en mode modal: atrapa el focus, tanca amb Esc i bloqueja la pàgina de sota.
  useEffect(() => {
    const d = dialeg.current;
    if (!d) return;
    if (obert && !d.open) d.showModal();
    if (!obert && d.open) d.close();
    document.documentElement.style.overflow = obert ? "hidden" : "";
  }, [obert]);

  const preu = preuFeste(plat.preu, ids);
  const falta = grups.find((g) => deGrup(ids, g).length < quants[g]);

  const toca = (id: string, g: Grup) =>
    setIds((ara) => {
      if (ara.includes(id)) return ara.filter((x) => x !== id);
      const delGrup = deGrup(ara, g).map((i) => i.id);
      // Principal i base: només n'hi cap un, el nou substitueix l'anterior.
      if (quants[g] === 1) return [...ara.filter((x) => !delGrup.includes(x)), id];
      return delGrup.length < quants[g] ? [...ara, id] : ara;
    });

  return (
    <dialog
      ref={dialeg}
      aria-labelledby="feste-titol"
      onClose={tanca}
      onClick={(e) => e.target === e.currentTarget && tanca()}
      className="popup m-auto max-h-[min(92dvh,860px)] w-[min(640px,calc(100vw-24px))] max-w-none rounded-[28px] border-0 bg-paper p-0 text-tinta backdrop:bg-tinta/40"
    >
      <form
        className="flex max-h-[inherit] flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (falta) return;
          afegeix({ slug: plat.slug, nom: plat.nom, preu, detall: detallFeste(ids), opcions: [...ids].sort() });
          setIds([]);
          tanca();
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-linia px-6 pt-5 pb-4">
          <div className="flex flex-col gap-1">
            <h2 id="feste-titol" className="m-0 text-[28px] leading-none tracking-[-.02em]">
              {plat.nom}
            </h2>
            <span className="text-[13px] text-suau">{t("subtitol")}</span>
          </div>
          <button
            type="button"
            onClick={tanca}
            aria-label={t("tanca")}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-2xl text-tinta hover:bg-linia/60"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-6 py-5">
          {grups.map((g) => {
            const triats = deGrup(ids, g).map((i) => i.id);
            return (
              <fieldset key={g} className="m-0 flex flex-col gap-3 border-0 p-0">
                <legend className="flex w-full items-baseline justify-between gap-3 pb-3">
                  <span className="font-titol text-lg">{t(`grups.${g}`)}</span>
                  <span className="text-[13px] text-suau">{t("compte", { n: triats.length, de: quants[g] })}</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {ingredients
                    .filter((i) => i.grup === g)
                    .map((i) => {
                      const triat = triats.includes(i.id);
                      const ple = !triat && quants[g] > 1 && triats.length >= quants[g];
                      return (
                        <button
                          key={i.id}
                          type="button"
                          aria-pressed={triat}
                          disabled={ple}
                          onClick={() => toca(i.id, g)}
                          className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${triat ? "border-granat bg-granat text-groc" : "border-linia bg-white text-tinta hover:border-granat"}`}
                        >
                          {i.nom}
                          {i.suplement && <span className={triat ? "text-groc/80" : "text-suau"}>+{euros(i.suplement)}</span>}
                          {i.tardor && <span className={`text-[11px] font-semibold tracking-[.08em] uppercase ${triat ? "text-groc/80" : "text-granat"}`}>{t("tardor")}</span>}
                        </button>
                      );
                    })}
                </div>
              </fieldset>
            );
          })}
          <p className="m-0 text-xs leading-[1.6] text-suau">{t("alergens", { llista: alergensFeste(ids).join(", ") })}</p>
        </div>

        <div className="border-t border-linia px-6 pt-4 pb-5">
          <button
            type="submit"
            disabled={!!falta}
            className="w-full cursor-pointer rounded-full border-0 bg-granat p-[17px] text-[13px] font-medium tracking-[.06em] text-paper uppercase disabled:cursor-not-allowed disabled:bg-linia disabled:text-suau"
          >
            {falta ? t(`falta.${falta}`) : t("confirma", { preu: euros(preu) })}
          </button>
        </div>
      </form>
    </dialog>
  );
}
