"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useCistella } from "./Cistella";

export function IconaCistella({ className = "" }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

/** Capçalera fixa: el logotip gran es fa petit (isotip) quan es baixa; a l'inici, quan s'acaba la portada. */
export function Capcalera() {
  const t = useTranslations("web.nav");
  const { unitats, bot, obre } = useCistella();
  const [avall, setAvall] = useState(false);
  const cap = useRef<HTMLElement>(null);

  // L'alçada de la capçalera gran: el separador la reserva i la portada s'hi posa a sota per fondre-s'hi.
  useEffect(() => {
    const el = cap.current;
    if (!el || avall) return;
    const desa = () => document.documentElement.style.setProperty("--cap", `${el.offsetHeight}px`);
    const ro = new ResizeObserver(desa);
    ro.observe(el);
    return () => ro.disconnect();
  }, [avall]);

  useEffect(() => {
    const mira = () => {
      const portada = document.getElementById("portada");
      setAvall(portada ? portada.getBoundingClientRect().bottom <= (cap.current?.offsetHeight ?? 0) : window.scrollY > 120);
    };
    mira();
    window.addEventListener("scroll", mira, { passive: true });
    window.addEventListener("resize", mira);
    return () => {
      window.removeEventListener("scroll", mira);
      window.removeEventListener("resize", mira);
    };
  }, []);

  return (
    <>
      <header ref={cap} className="fixed inset-x-0 top-0 z-40 bg-granat text-groc">
        <div className={`mx-auto grid max-w-[1240px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-[clamp(18px,4vw,56px)] transition-[padding] duration-300 ${avall ? "py-3" : "py-[22px]"}`}>
          <nav aria-label={t("principal")} className="hidden items-center gap-[clamp(12px,1.6vw,22px)] text-[15px] md:flex">
            <Link href="/carta" className="px-1 py-2.5 whitespace-nowrap text-groc no-underline hover:text-paper">
              {t("carta")}
            </Link>
            <Link href="/#padro" className="px-1 py-2.5 whitespace-nowrap text-groc no-underline hover:text-paper">
              {t("padro")}
            </Link>
            <Link href="/#carnet" className="px-1 py-2.5 whitespace-nowrap text-groc no-underline hover:text-paper">
              {t("carnet")}
            </Link>
            <Link href="/#on" className="px-1 py-2.5 whitespace-nowrap text-groc no-underline hover:text-paper">
              {t("on")}
            </Link>
          </nav>

          <Link href="/" aria-label={t("inici")} className={`col-start-2 flex items-center justify-self-center transition-[height] duration-300 ${avall ? "h-[42px]" : "h-[clamp(40px,4vw,62px)]"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG de marca */}
            <img src={avall ? "/brand/isotip-groc.svg" : "/brand/imagotip-groc.svg"} alt="La Carmanyola" className="h-full w-auto" />
          </Link>

          <div className="flex items-center gap-3.5 justify-self-end">
            <span className="hidden text-xs tracking-[.08em] whitespace-nowrap opacity-60 lg:inline">{t("idiomes")}</span>
            <button key={bot} type="button" onClick={obre} aria-haspopup="dialog" aria-label={t("cistella", { n: unitats })} className={`relative flex size-12 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-groc ${bot ? "bota" : ""}`}>
              <IconaCistella />
              {unitats > 0 && (
                <b className="absolute -top-1 -right-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-groc px-1.5 text-xs font-semibold text-granat">{unitats}</b>
              )}
            </button>
            <Link href="/carta" className="web-btn hidden bg-groc px-[22px] py-3.5 whitespace-nowrap text-granat hover:bg-paper md:inline-flex">
              {t("demana")}
            </Link>
          </div>
        </div>
      </header>
      <div aria-hidden className="h-(--cap,106px)" />
    </>
  );
}
