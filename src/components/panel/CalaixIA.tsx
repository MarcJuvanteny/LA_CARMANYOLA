"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Isotip } from "@/components/brand/Isotip";
import { cx } from "./ui";

/**
 * Calaix lateral amb el que proposa la IA en una pàgina de dades.
 * La pàgina queda neta; una pestanya a la vora dreta (o un botó flotant al mòbil) l'obre.
 * S'obre sol amb #ia a l'adreça (els enllaços del Resum hi porten).
 */
export function CalaixIA({ n, children }: { n: number; children: ReactNode }) {
  const t = useTranslations("panel.ia");
  const [obert, setObert] = useState(false);
  const tanca = useRef<HTMLButtonElement>(null);
  const pestanya = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (window.location.hash === "#ia") setObert(true);
  }, []);

  useEffect(() => {
    if (!obert) return;
    tanca.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setObert(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [obert]);

  const tancaCalaix = () => {
    setObert(false);
    pestanya.current?.focus();
  };

  return (
    <>
      <button
        ref={pestanya}
        type="button"
        onClick={() => setObert(true)}
        aria-expanded={obert}
        aria-controls="calaix-ia"
        className={cx(
          "fixed z-30 flex items-center gap-2 bg-tinta font-semibold text-white shadow-lg transition-opacity hover:bg-tinta/90 print:hidden",
          // Mòbil: botó flotant a baix. Escriptori: pestanya vertical a la vora dreta.
          "right-4 bottom-4 min-h-12 rounded-full px-4 text-sm",
          "lg:top-1/2 lg:right-0 lg:bottom-auto lg:-translate-y-1/2 lg:flex-col lg:rounded-l-2xl lg:rounded-r-none lg:px-2.5 lg:py-4",
          obert && "pointer-events-none opacity-0",
        )}
      >
        <span className="grid size-6 place-items-center rounded-full bg-groc">
          <Isotip className="size-4" />
        </span>
        <span className="lg:[writing-mode:vertical-rl] lg:rotate-180">{t("pestanya")}</span>
        {n > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-granat px-1.5 text-[0.7rem] tabular-nums">
            {n}
            <span className="sr-only"> {t("perRevisar")}</span>
          </span>
        )}
      </button>

      {obert && <div className="fixed inset-0 z-30 bg-tinta/20 lg:hidden" aria-hidden onClick={tancaCalaix} />}

      <aside
        id="calaix-ia"
        role="dialog"
        aria-modal="false"
        aria-labelledby="calaix-ia-titol"
        hidden={!obert}
        className="fixed top-0 right-0 z-40 flex h-dvh w-[min(440px,100vw)] flex-col border-l border-linia bg-paper shadow-2xl print:hidden"
      >
        <div className="flex items-center justify-between gap-3 border-b border-linia px-5 py-4">
          <h2 id="calaix-ia-titol" className="flex items-center gap-2.5 text-[1.05rem]">
            <span className="grid size-7 place-items-center rounded-full bg-groc" aria-hidden>
              <Isotip className="size-4" />
            </span>
            {t("titol")}
          </h2>
          <button
            ref={tanca}
            type="button"
            onClick={tancaCalaix}
            aria-label={t("tanca")}
            className="grid size-11 place-items-center rounded-full text-[1.3rem] text-suau hover:bg-white hover:text-tinta"
          >
            ×
          </button>
        </div>
        <p className="px-5 pt-3 text-[0.82rem] text-suau">{t("nota")}</p>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 pt-4 pb-8">{children}</div>
      </aside>
    </>
  );
}
