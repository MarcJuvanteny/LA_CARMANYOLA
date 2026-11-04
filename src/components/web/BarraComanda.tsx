"use client";

import { useTranslations } from "next-intl";
import { euros } from "@/lib/format";
import { useCistella } from "./Cistella";

/** Barra flotant de la carta: què hi ha a la cistella i el botó per anar-hi. */
export function BarraComanda() {
  const t = useTranslations("web.barra");
  const { unitats, total, obre } = useCistella();
  if (!unitats) return null;
  return (
    <div className="sticky bottom-5 z-30 mx-auto mt-8 flex max-w-[560px] items-center justify-between rounded-full bg-granat py-2 pr-2 pl-[22px] shadow-[0_8px_30px_rgb(56_56_58/0.18)]">
      <span className="text-sm text-paper">{t("resum", { n: unitats, total: euros(total) })}</span>
      <button type="button" onClick={obre} aria-haspopup="dialog" className="cursor-pointer rounded-full border-0 bg-paper px-[18px] py-[13px] text-[13px] font-medium tracking-[.06em] text-granat uppercase">
        {t("veure")}
      </button>
    </div>
  );
}
