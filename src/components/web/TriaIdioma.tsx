"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { canviaIdioma } from "@/app/(web)/idioma";

const IDIOMES = [
  { l: "ca", nom: "Català" },
  { l: "es", nom: "Español" },
  { l: "en", nom: "English" },
] as const;

/** CA · ES · EN: botons reals; l'actiu porta aria-current. */
export function TriaIdioma({ className = "" }: { className?: string }) {
  const actiu = useLocale();
  const t = useTranslations("web.nav");
  const router = useRouter();
  const [, canvia] = useTransition();
  return (
    <div role="group" aria-label={t("idioma")} className={`items-center text-xs tracking-[.08em] ${className}`}>
      {IDIOMES.map(({ l, nom }, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span aria-hidden className="opacity-40">·</span>}
          <button
            type="button"
            lang={l}
            aria-label={nom}
            aria-current={actiu === l ? "true" : undefined}
            onClick={() =>
              canvia(async () => {
                await canviaIdioma(l);
                router.refresh();
              })
            }
            className={`flex min-h-11 min-w-9 cursor-pointer items-center justify-center border-0 bg-transparent px-1 text-xs tracking-[.08em] text-groc uppercase ${actiu === l ? "font-semibold underline underline-offset-4" : "opacity-60 hover:opacity-100"}`}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}
