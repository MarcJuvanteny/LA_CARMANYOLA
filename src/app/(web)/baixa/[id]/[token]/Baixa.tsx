"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { confirmaBaixa } from "./actions";

/** Un botó (no un enllaç que es dispari sol): els antivirus del correu obren els enllaços. */
export function Baixa({ id, token }: { id: string; token: string }) {
  const t = useTranslations("web.baixa");
  const [fet, setFet] = useState<boolean | null>(null);
  const [enviant, envia] = useTransition();
  if (fet) return <p role="status" className="m-0 rounded-[18px] bg-groc px-5 py-4 text-center text-[15px] text-granat">{t("fet")}</p>;
  return (
    <>
      {fet === false && <p role="alert" className="m-0 text-granat">{t("error")}</p>}
      <button
        type="button"
        disabled={enviant}
        onClick={() => envia(async () => setFet(await confirmaBaixa(id, token)))}
        className="cursor-pointer rounded-full border-0 bg-granat p-[17px] text-[13px] font-medium tracking-[.06em] text-paper uppercase disabled:opacity-60"
      >
        {t("boto")}
      </button>
    </>
  );
}
