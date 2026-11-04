"use client";

import { useTranslations } from "next-intl";
import { euros } from "@/lib/format";
import { preuLinia, type Comanda } from "./Cistella";

/** El resum d'una comanda confirmada: al calaix, just en confirmar-la, i a /comanda/[id]. */
export function ResumConfirmada({ comanda, sumant = false }: { comanda: Comanda; sumant?: boolean }) {
  const carnet = comanda.carnet;
  const t = useTranslations("web.comanda");
  return (
    <>
      <header className="flex flex-col items-center gap-3.5 px-2 pt-4 pb-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/isotip-granat.svg" alt="" className="size-14" />
        <h1 className="m-0 text-[30px] tracking-[-.02em]">{t("confirmada")}</h1>
        <p className="m-0 text-[15px] leading-[1.6]">
          {t.rich("recull", { hora: comanda.hora, b: (c) => <strong className="font-semibold">{c}</strong> })}
          <br />
          [ADREÇA], Poblenou
        </p>
      </header>

      <section className="flex flex-col gap-2.5 rounded-[22px] bg-white p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="web-eb m-0 font-cos text-xs tracking-[.1em] text-granat">{t("numero", { n: comanda.numero })}</h2>
          <span className="text-[13px]">{t("estat")}</span>
        </div>
        {comanda.linies.map((l) => (
          <div key={l.id} className="flex justify-between gap-3 text-[15px]">
            <span>
              {l.quantitat} × {l.nom}
              {l.detall && <span className="block text-xs text-suau">{l.detall}</span>}
              {l.dinar && <span className="block text-xs text-suau">{t("dinar", { nom: l.dinar.nom.toLowerCase() })}</span>}
            </span>
            <span>{euros(preuLinia(l))}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-linia pt-3 text-base font-semibold">
          <span>{t("total")}</span>
          <span>{euros(comanda.total)}</span>
        </div>
      </section>

      {/* Només si s'ha escrit el mòbil del carnet: una línia, sense desviar la comanda. */}
      {(sumant || carnet) && (
        <p role="status" className="m-0 rounded-[18px] bg-groc px-5 py-4 text-center text-[15px] leading-[1.5] text-granat">
          {sumant
            ? t("sumant")
            : carnet?.trobat
              ? carnet.a
                ? t.rich("sumada", {
                    nom: carnet.nom,
                    de: carnet.de ?? "",
                    a: carnet.a,
                    n: carnet.paraules,
                    s: (c) => <span className="line-through opacity-60">{c}</span>,
                    b: (c) => <strong className="font-semibold">{c}</strong>,
                  })
                : t("sumadaSenseParaula", { nom: carnet.nom, n: carnet.paraules })
              : t("noCarnet", { mobil: carnet?.mobil ?? "" })}
          {carnet?.trobat && carnet.complet && <span className="mt-1 block font-semibold">{t("complet")}</span>}
        </p>
      )}
    </>
  );
}
