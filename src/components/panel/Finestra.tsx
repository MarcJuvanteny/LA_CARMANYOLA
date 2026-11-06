"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";

/** Finestra emergent amb <dialog>: focus atrapat, Esc i clic fora la tanquen. */
export function Finestra({ obert, titol, onTanca, accions, children }: { obert: boolean; titol: ReactNode; onTanca: () => void; accions?: ReactNode; children: ReactNode }) {
  const t = useTranslations("panel");
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (obert && !d.open) d.showModal();
    if (!obert && d.open) d.close();
  }, [obert]);
  return (
    <dialog
      ref={ref}
      aria-labelledby="finestra-titol"
      onClose={onTanca}
      onClick={(e) => e.target === e.currentTarget && onTanca()}
      className="m-auto max-h-[90dvh] w-[min(560px,calc(100vw-32px))] overflow-y-auto rounded-targeta bg-white p-0 text-tinta shadow-2xl backdrop:bg-tinta/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-linia bg-white px-6 py-4">
        <h2 id="finestra-titol" className="min-w-0 truncate font-cos text-[1.1rem] font-semibold">
          {titol}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {accions}
          <button type="button" onClick={onTanca} aria-label={t("tanca")} className="grid size-11 shrink-0 place-items-center rounded-full text-[1.3rem] text-suau hover:bg-paper hover:text-tinta">
            ×
          </button>
        </div>
      </div>
      <div className="px-6 pt-5 pb-6">{children}</div>
    </dialog>
  );
}
