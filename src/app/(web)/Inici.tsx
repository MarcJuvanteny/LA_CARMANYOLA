"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useCistella } from "@/components/web/Cistella";
import { QrCarnet } from "@/components/web/QrCarnet";
import { TriaFeste } from "@/components/web/TriaFeste";
import { euros } from "@/lib/format";
import { desbowlitza, padroTardor, type PlatWeb } from "@/lib/web/contingut";

/** Alçada de la capçalera quan es fa petita (en baixar) */
const CAP_PETITA = 72;
/** Granat que queda sota les targetes del padró quan s'acaba */
const AIRE_PADRO = 110;
const voraWrap = "max(18px, calc((100vw - 1240px) / 2 + 56px))";
const wrap = "mx-auto w-full max-w-[1240px] px-[clamp(18px,4vw,56px)]";

/** 0 → 1 suau entre a i b */
const suau = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Scroll {
  /** Progrés de la portada fixada (0–1) */
  h: number;
  /** Progrés de la secció Desbowlitzar (0–1) */
  d: number;
  /** Progrés del padró (0–1) */
  pr: number;
}

function useScrollInici() {
  const [s, setS] = useState<Scroll>({ h: 0, d: 0, pr: 0 });
  const [recorregut, setRecorregut] = useState(0);
  const pista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const calcula = () => {
      raf = 0;
      const vh = window.innerHeight || 900;
      const progres = (id: string, enganxat: number) => {
        const el = document.getElementById(id);
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        const total = r.height - enganxat;
        return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      };
      setRecorregut(pista.current ? Math.max(0, pista.current.scrollWidth - window.innerWidth) : 0);
      setS({
        h: progres("portada", vh),
        d: progres("desb", Math.min(vh - 90, 640)),
        pr: progres("padro", Math.min(vh - CAP_PETITA, 860) + AIRE_PADRO),
      });
    };
    const programa = () => {
      if (!raf) raf = requestAnimationFrame(calcula);
    };
    window.addEventListener("scroll", programa, { passive: true });
    window.addEventListener("resize", programa);
    calcula();
    return () => {
      window.removeEventListener("scroll", programa);
      window.removeEventListener("resize", programa);
      cancelAnimationFrame(raf);
    };
  }, []);

  return { s, recorregut, pista };
}

/** La galeria de plats avança sola i dona la volta (la llista hi és dues vegades). Es para mentre s'hi toca. */
function useDesfila() {
  const ref = useRef<HTMLDivElement>(null);
  const salta = useRef<(sentit: 1 | -1) => void>(() => {});

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let abans = 0;
    let pos = el.scrollLeft;
    let sobre = false;
    let quiet = 0;
    // Les fletxes: avança o recula una targeta (i, si cal, dona la volta abans de recular).
    salta.current = (sentit) => {
      const v = volta();
      const targeta = (el.querySelector("article") as HTMLElement | null)?.offsetWidth ?? 280;
      quiet = performance.now() + 4000;
      // Es dona la volta abans de lliscar, perquè el bucle no l'hagi de fer a mig moviment.
      if (v && sentit < 0 && el.scrollLeft < targeta + 18) el.scrollLeft += v;
      if (v && sentit > 0 && el.scrollLeft + targeta + 18 >= v) el.scrollLeft -= v;
      el.scrollBy({ left: sentit * (targeta + 18), behavior: "smooth" });
    };
    // Distància d'una volta: on comença la còpia respecte de l'original.
    const volta = () => {
      const copia = el.querySelector<HTMLElement>("[data-copia]");
      return copia ? copia.offsetLeft - (el.firstElementChild as HTMLElement).offsetLeft : 0;
    };
    const pas = (ara: number) => {
      const dt = abans ? Math.min(ara - abans, 50) : 0;
      abans = ara;
      const v = volta();
      if (sobre || ara < quiet || !v) {
        pos = el.scrollLeft;
      } else {
        pos += dt * 0.035;
      }
      if (v && pos >= v) pos -= v;
      if (v && pos < 0) pos += v;
      if (Math.abs(el.scrollLeft - pos) >= 0.5) el.scrollLeft = pos;
      raf = requestAnimationFrame(pas);
    };
    const entra = (e: PointerEvent) => {
      if (e.pointerType === "mouse") sobre = true;
    };
    const surt = () => {
      sobre = false;
    };
    const toca = () => {
      quiet = performance.now() + 2500;
    };
    // Amb el ratolí, s'arrossega; si s'ha arrossegat, el clic no obre el plat.
    let agafat: { x: number; inici: number } | null = null;
    let arrossegat = false;
    const prem = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      agafat = { x: e.clientX, inici: el.scrollLeft };
      arrossegat = false;
    };
    const mou = (e: PointerEvent) => {
      if (!agafat) return;
      const dx = e.clientX - agafat.x;
      if (Math.abs(dx) > 5) arrossegat = true;
      if (arrossegat) {
        e.preventDefault();
        el.scrollLeft = agafat.inici - dx;
      }
    };
    const deixa = () => {
      agafat = null;
    };
    const noArrossega = (e: DragEvent) => e.preventDefault();
    const clic = (e: MouseEvent) => {
      if (arrossegat) {
        e.preventDefault();
        e.stopPropagation();
        arrossegat = false;
      }
    };
    el.addEventListener("pointerenter", entra);
    el.addEventListener("pointerleave", surt);
    el.addEventListener("touchstart", toca, { passive: true });
    el.addEventListener("touchmove", toca, { passive: true });
    el.addEventListener("wheel", toca, { passive: true });
    el.addEventListener("focusin", toca);
    el.addEventListener("pointerdown", prem);
    el.addEventListener("click", clic, true);
    el.addEventListener("dragstart", noArrossega);
    window.addEventListener("pointermove", mou);
    window.addEventListener("pointerup", deixa);
    raf = requestAnimationFrame(pas);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", entra);
      el.removeEventListener("pointerleave", surt);
      el.removeEventListener("touchstart", toca);
      el.removeEventListener("touchmove", toca);
      el.removeEventListener("wheel", toca);
      el.removeEventListener("focusin", toca);
      el.removeEventListener("pointerdown", prem);
      el.removeEventListener("click", clic, true);
      el.removeEventListener("dragstart", noArrossega);
      window.removeEventListener("pointermove", mou);
      window.removeEventListener("pointerup", deixa);
    };
  }, []);

  return { ref, salta: (sentit: 1 | -1) => salta.current(sentit) };
}

export function Inici({ plats, preuFeste }: { plats: PlatWeb[]; preuFeste: number }) {
  const t = useTranslations("web.inici");
  const tn = useTranslations("web.nav");
  const { afegeix } = useCistella();
  const { s, recorregut, pista } = useScrollInici();
  const galeria = useDesfila();
  const [feste, setFeste] = useState(false);
  const [llest, setLlest] = useState(false);
  const [senseBowl, setSenseBowl] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setLlest(true), 60);
    // Quan la ratlla acaba de tatxar «bowl», el bowl es fa carmanyola: sense haver de baixar.
    const plat = setTimeout(() => setSenseBowl(true), 1500);
    return () => {
      clearTimeout(id);
      clearTimeout(plat);
    };
  }, []);

  const ratlla = (i: number) => suau(0.08 + i * 0.16, 0.2 + i * 0.16, s.d);
  // A la portada: el bowl es fa plat en tatxar-lo (o, si es baixa abans, mentre el títol canvia).
  const aCarmanyola = senseBowl ? 1 : suau(0.38, 0.6, s.h);
  const titol1 = 1 - suau(0.3, 0.48, s.h);
  const titol2 = suau(0.52, 0.72, s.h);
  const imatge = (slug: string) => plats.find((p) => p.slug === slug)?.imatge ?? "/web/plats/fricando-amb-bolets.webp";

  return (
    <main>
      {/* Portada: es queda quieta mentre el bowl es fa plat i la pregunta troba resposta */}
      <section id="portada" className="tex-granat relative h-[300vh] text-groc" style={{ marginTop: "calc(-1 * var(--cap, 106px))" }}>
        <div className="sticky top-0 flex h-svh items-center overflow-hidden" style={{ paddingTop: "var(--cap, 106px)" }}>
          {/* El plat, sencer al costat del text: el text (i la seva A) hi passa per sobre */}
          <div aria-hidden className="pointer-events-none absolute top-[calc(50%+var(--cap,106px)/2)] right-[clamp(24px,4vw,90px)] hidden aspect-square h-[min(66vh,42vw)] -translate-y-1/2 md:block">
            <svg viewBox="0 0 200 200" className="absolute inset-0 size-full transition-opacity duration-500" style={{ opacity: 1 - aCarmanyola }}>
              <circle cx="100" cy="100" r="96" fill="#2EC4B6" />
              <circle cx="100" cy="100" r="82" fill="#E9FBF9" />
              <path d="M100 100 L100 18 A82 82 0 0 1 171 59 Z" fill="#FF8A73" />
              <path d="M100 100 L171 59 A82 82 0 0 1 171 141 Z" fill="#FFD166" />
              <path d="M100 100 L171 141 A82 82 0 0 1 100 182 Z" fill="#9B8CFF" />
              <path d="M100 100 L100 182 A82 82 0 0 1 29 141 Z" fill="#FF8A73" />
              <path d="M100 100 L29 141 A82 82 0 0 1 29 59 Z" fill="#FFFFFF" />
              <path d="M100 100 L29 59 A82 82 0 0 1 100 18 Z" fill="#7FDCD2" />
              <circle cx="100" cy="100" r="22" fill="#FFFFFF" />
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imatge("fricando-amb-bolets")}
              alt=""
              className="absolute inset-0 size-full object-contain drop-shadow-[0_30px_40px_rgb(0_0_0/0.3)] transition-opacity duration-500"
              style={{ opacity: aCarmanyola }}
            />
          </div>
          <div className={`${wrap} relative flex flex-col gap-[clamp(28px,3.4vw,44px)]`}>
            <span className="web-eb text-paper/70">{t("eyebrow")}</span>
            <div className="grid">
              <h1
                className="m-0 max-w-[1000px] text-[clamp(56px,8.4vw,140px)] leading-[.92] tracking-[-.02em] [grid-area:1/1]"
                style={{
                  opacity: titol1,
                  transform: `translateY(${(1 - titol1) * -60}px)`,
                  visibility: titol1 ? "visible" : "hidden",
                }}
              >
                {t.rich("titol", {
                  br: () => <br />,
                  x: (c) => (
                    <span className="ratlla text-[#2EC4B6]">
                      {c}
                      <i className="bg-groc transition-transform delay-400 duration-900 ease-[cubic-bezier(.7,0,.2,1)]" style={{ transform: `scaleX(${llest ? 1 : 0})` }} />
                    </span>
                  ),
                })}
              </h1>
              <div
                className="flex max-w-[1000px] flex-col justify-center gap-[clamp(14px,2vw,26px)] [grid-area:1/1]"
                style={{
                  opacity: titol2,
                  transform: `translateY(${(1 - titol2) * 60}px)`,
                  visibility: titol2 ? "visible" : "hidden",
                }}
              >
                <p className="font-titol m-0 text-[clamp(30px,3.8vw,60px)] leading-none text-paper">{t.rich("quedaTitol", { br: () => <br /> })}</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG de marca */}
                <img src="/brand/imagotip-groc.svg" alt="La Carmanyola" className="h-auto w-[min(100%,clamp(300px,52vw,860px))] self-start" />
              </div>
            </div>
            <Link href="/carta" className="web-btn self-start bg-groc text-granat">
              {tn("demana")}
            </Link>
          </div>
        </div>
      </section>
      <div aria-hidden className="franja-granat [--files:3]" />

      {/* Avui a la carmanyola */}
      <section id="demana" className="scroll-mt-24 pt-[clamp(70px,8vw,120px)] pb-[clamp(50px,6vw,90px)]">
        <div className={`${wrap} flex flex-wrap items-end justify-between gap-[18px]`}>
          <div className="flex flex-col gap-2.5">
            <span className="web-eb text-granat">{t("demanaEyebrow")}</span>
            <h2 className="m-0 text-[clamp(40px,5vw,72px)] leading-none">{t("demanaTitol")}</h2>
          </div>
          <Link href="/carta" className="web-btn border-[1.5px] border-granat text-granat">
            {t("totaCarta")}
          </Link>
        </div>
        {/* Desfila sola; en passar-hi el ratolí o tocar-la, s'atura i es pot moure a mà */}
        <div className="relative mt-[34px]">
          {/* Les fletxes, una a cada costat de la pantalla: cap on apunten, cap allà va la galeria */}
          {([-1, 1] as const).map((sentit) => (
            <button
              key={sentit}
              type="button"
              onClick={() => galeria.salta(sentit)}
              aria-label={t(sentit < 0 ? "anterior" : "seguent")}
              className={`absolute top-1/2 z-20 hidden size-14 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-granat text-2xl text-groc shadow-[0_8px_24px_rgb(56_56_58/0.25)] transition-transform hover:scale-110 active:scale-95 md:flex ${sentit < 0 ? "left-[clamp(12px,2vw,32px)]" : "right-[clamp(12px,2vw,32px)]"}`}
            >
              {sentit < 0 ? "←" : "→"}
            </button>
          ))}
          <div ref={galeria.ref} className="sense-barra flex gap-[18px] overflow-x-auto pt-2.5 pb-6" style={{ paddingInline: voraWrap }}>
            {[false, true].map((copia) => (
              <div key={String(copia)} data-copia={copia || undefined} aria-hidden={copia || undefined} className="flex shrink-0 gap-[18px]">
                {plats.map((p) => (
                  <article key={p.slug} className="plat-card relative flex w-[clamp(220px,22vw,280px)] shrink-0 flex-col gap-2.5 rounded-[28px] bg-white p-4 pb-[18px]">
                    {p.imatge && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imatge} alt={p.nom} className="aspect-square w-full object-contain" />
                    )}
                    {p.lema && <span className="web-eb text-[11px] text-granat">{p.lema}</span>}
                    <Link
                      href={`/carta/${p.slug}`}
                      tabIndex={copia ? -1 : undefined}
                      className="font-titol text-xl leading-[1.15] text-tinta no-underline after:absolute after:inset-0 after:rounded-[28px]"
                    >
                      {p.nom}
                    </Link>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-titol text-[19px]">{euros(p.preu)}</span>
                      <button
                        type="button"
                        tabIndex={copia ? -1 : undefined}
                        aria-label={t("afegeix", { plat: p.nom })}
                        onClick={() => afegeix({ slug: p.slug, nom: p.nom, preu: p.preu })}
                        className="relative z-10 flex size-12 cursor-pointer items-center justify-center rounded-full bg-granat text-2xl leading-none text-groc transition-transform hover:scale-110 active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </article>
                ))}
                <button
                  type="button"
                  tabIndex={copia ? -1 : undefined}
                  onClick={() => setFeste(true)}
                  aria-haspopup="dialog"
                  className="plat-card tex-groc flex w-[clamp(220px,22vw,280px)] shrink-0 cursor-pointer flex-col rounded-[28px] border-0 p-4 pb-[18px] text-left text-granat"
                >
                  <span className="font-titol flex flex-1 items-center justify-center text-center text-[44px] leading-none">Fes-te’l tu</span>
                  {/* Com a les altres targetes: el preu a baix i el + al costat */}
                  <span className="flex w-full items-center justify-between">
                    <span className="font-titol text-[19px] text-tinta">{euros(preuFeste)}</span>
                    <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-granat text-2xl leading-none text-groc">
                      +
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
        <TriaFeste obert={feste} tanca={() => setFeste(false)} plat={{ slug: "fes-te-l-tu", nom: "Fes-te'l tu", preu: preuFeste }} />
        <div className={wrap}>
          <p className="m-0 text-[15px]">
            {t.rich("dinar", {
              b: (c) => <strong className="font-semibold text-granat">{c}</strong>,
            })}
          </p>
        </div>
      </section>

      {/* Operació Desbowlitzar: les paraules importades es ratllen en baixar */}
      <section id="desb" className="relative h-[1300px]">
        <div className="sticky top-[90px] flex h-[min(calc(100vh-90px),640px)] items-center">
          <div className={`${wrap} flex flex-col gap-[22px]`}>
            <span className="web-eb text-granat">{t("desbEyebrow")}</span>
            <div className="flex flex-col gap-1.5">
              {desbowlitza.map(([fora, aqui], i) => (
                <div key={fora} className="font-titol flex flex-wrap items-baseline gap-x-[26px] gap-y-1.5 text-[clamp(30px,4.2vw,60px)]">
                  <span className="ratlla text-[#2EC4B6]">
                    {fora}
                    <i className="bg-granat" style={{ transform: `scaleX(${ratlla(i)})` }} />
                  </span>
                  <span className="text-granat transition-opacity duration-300" style={{ opacity: 0.15 + ratlla(i) * 0.85 }}>
                    {aqui}
                  </span>
                </div>
              ))}
            </div>
            <p className="m-0 max-w-[520px] text-[17px] leading-[1.6]">{t("desbText")}</p>
          </div>
        </div>
      </section>

      {/* Així es fa una carmanyola: els tres punts */}
      <section className="pb-[clamp(60px,8vw,120px)]">
        <div className={`${wrap} flex flex-col gap-[clamp(36px,5vw,64px)]`}>
          <div className="flex flex-col gap-[22px]">
            <span className="web-eb rv text-granat">{t("puntsEyebrow")}</span>
            <h2 className="rv m-0 text-[clamp(44px,5.6vw,88px)] leading-none text-granat">{t.rich("puntsTitol", { br: () => <br /> })}</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-[18px]">
            {(t.raw("punts") as { titol: string; text: string }[]).map((p) => (
              <div key={p.titol} className="rv flex flex-col gap-2.5 border-t-2 border-granat pt-5">
                <span className="font-titol text-[30px] text-granat">{p.titol}</span>
                <span className="text-[17px] leading-[1.6]">{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* El padró: la fila avança de costat mentre es baixa */}
      <section id="padro" className="tex-granat relative h-[2600px] pb-[110px] text-paper">
        <div className="sticky top-[72px] flex h-[min(calc(100vh-72px),860px)] flex-col justify-center gap-[34px] overflow-hidden">
          <div className={`${wrap} flex flex-wrap items-end justify-between gap-3.5`}>
            <div className="flex flex-col gap-2.5">
              <span className="web-eb text-groc">{t("padroEyebrow")}</span>
              <h2 className="m-0 text-[clamp(38px,4.6vw,68px)] leading-none text-groc">{t("padroTitol")}</h2>
            </div>
            <span className="text-[15px]">{t("padroBaixa")}</span>
          </div>
          <div
            ref={pista}
            className="flex gap-5 will-change-transform"
            style={{
              paddingLeft: voraWrap,
              transform: `translateX(${-s.pr * recorregut}px)`,
            }}
          >
            {padroTardor.map((p) => (
              <PadroParella key={p.ingredient} p={p} etiqueta={t("ingredient")} />
            ))}
            <article className={`${targeta} border-2 border-dashed border-groc/60 text-groc`}>
              <span className="web-eb">{t("properament")}</span>
              <div className="flex flex-col gap-2.5">
                <span className="font-titol text-5xl leading-none">{t("calcots")}</span>
                <span className="text-[15px] text-paper">{t("avisarem")}</span>
              </div>
            </article>
            <span className="flex-[0_0_18px]" />
          </div>
        </div>
      </section>

      {/* El carnet */}
      {/* Tot l'apartat, QR inclòs, cap en una pantalla (sota la capçalera) */}
      <section id="carnet" className="flex scroll-mt-[72px] items-center py-[clamp(56px,7vw,96px)] md:min-h-[calc(100svh-72px)]">
        <div className={`${wrap} grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-[clamp(40px,6vw,90px)]`}>
          <div className="flex flex-col gap-6">
            <span className="web-eb rv text-granat">{t("carnetEyebrow")}</span>
            <h2 className="rv m-0 text-[clamp(44px,5vw,76px)] leading-none text-granat">{t.rich("carnetTitol", { br: () => <br /> })}</h2>
            <p className="rv m-0 max-w-[500px] text-lg leading-[1.6]">{t("carnetText")}</p>
            <div className="rv flex flex-wrap items-center gap-3">
              <Link href="/carnet" className="web-btn bg-granat text-groc">
                {t("carnetCta")}
              </Link>
              <span className="text-sm">{t("carnetNota")}</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-[clamp(24px,3vw,40px)]">
            <div className="grid grid-cols-[repeat(4,minmax(0,max-content))] justify-center gap-[clamp(10px,1.4vw,16px)]">
              {desbowlitza.map(([, aqui]) => (
                <div key={aqui} className={`${paraula} pop font-titol bg-granat text-groc`}>
                  {aqui}
                </div>
              ))}
              {[0, 1, 2].map((i) => (
                <div key={i} className={`${paraula} pop font-titol border-2 border-dashed border-granat text-[26px] text-granat`}>
                  ?
                </div>
              ))}
              <div className={`${paraula} pop bg-groc !p-1.5`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/web/plats/crema-catalana.webp" alt={t("cremaRegal")} className="size-full object-contain" />
              </div>
            </div>
            {/* Des de l'ordinador, el camí curt: escanejar i fer-se'l al mòbil */}
            <div className="rv hidden w-full max-w-[496px] items-center gap-5 rounded-[22px] bg-white p-4 pr-6 md:flex">
              <QrCarnet className="size-[112px] shrink-0" />
              <span className="text-[15px] leading-[1.55]">{t("carnetQr")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* On som */}
      <section id="on" className="tex-groc py-[clamp(80px,10vw,150px)]">
        <div className={`${wrap} grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-[clamp(40px,6vw,80px)]`}>
          <div className="flex flex-col gap-[22px] text-granat">
            <span className="web-eb rv">{t("onEyebrow")}</span>
            <h2 className="rv m-0 text-[clamp(44px,5.6vw,88px)] leading-none">{t("onTitol")}</h2>
            <dl className="rv m-0 flex flex-col text-[17px] text-tinta">
              {(
                [
                  ["adreca", "adrecaValor"],
                  ["horari", "horariValor"],
                  ["recollida", "recollidaValor"],
                ] as const
              ).map(([k, v], i) => (
                <div key={k} className={`flex justify-between gap-5 py-3.5 ${i < 2 ? "border-b border-granat/25" : ""}`}>
                  <dt className="font-semibold">{t(k)}</dt>
                  <dd className="m-0 text-right">{t(v)}</dd>
                </div>
              ))}
            </dl>
            <div className="rv flex flex-wrap gap-3">
              <Link href="/carta" className="web-btn bg-granat text-groc">
                {tn("demana")}
              </Link>
              <a href="https://www.google.com/maps/search/?api=1&query=Poblenou%2C%20Barcelona" target="_blank" rel="noopener" className="web-btn border-[1.5px] border-granat text-granat">
                {t("comArribar")}
              </a>
            </div>
          </div>
          <Mapa imatge={imatge("fricando-amb-bolets")} etiqueta={t("mapa")} mar={t("mar")} barri={t("barri")} />
        </div>
      </section>
    </main>
  );
}

const targeta = "relative flex h-[clamp(380px,40vw,500px)] flex-[0_0_clamp(260px,26vw,360px)] flex-col justify-between overflow-hidden rounded-[32px] p-7";
const paraula = "flex aspect-square w-[clamp(78px,8vw,112px)] items-center justify-center rounded-full p-2 text-center text-sm leading-[1.15]";

function PadroParella({ p, etiqueta }: { p: (typeof padroTardor)[number]; etiqueta: string }) {
  return (
    <>
      <article className={`${targeta} @container bg-groc text-granat`}>
        <span className="web-eb">{etiqueta}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.producte} alt={p.ingredient} loading="lazy" className="my-4 min-h-0 w-full flex-1 rounded-[20px] object-cover" />
        <div className="flex flex-col gap-2">
          <span className="font-titol text-[min(56px,12.5cqi)] leading-[.95] whitespace-nowrap">{p.ingredient}</span>
          <span className="text-base text-tinta">{p.origen}</span>
          <span className="text-sm text-tinta">{p.fins}</span>
        </div>
      </article>
      <article className={`${targeta} justify-end! bg-granat-clar text-groc`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.imatge} alt={p.foto} loading="lazy" className="absolute inset-0 size-full object-cover" />
        <span className="absolute inset-0 bg-linear-to-t from-granat via-granat/50 via-35% to-transparent to-60%" />
        <div className="relative flex flex-col gap-2.5">
          <span className="font-titol text-[28px] leading-[1.15]">{p.cita}</span>
          <span className="text-[15px] text-paper">{p.qui}</span>
        </div>
      </article>
    </>
  );
}

function Mapa({ imatge, etiqueta, mar, barri }: { imatge: string; etiqueta: string; mar: string; barri: string }) {
  return (
    <div className="rv relative aspect-square w-full max-w-[560px] justify-self-center overflow-hidden rounded-[36px] bg-[#FFFDF6]">
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" role="img" aria-label={etiqueta}>
        <rect width="400" height="400" fill="#FFFDF6" />
        <g stroke="#EADFCB" strokeWidth="10" transform="rotate(45 200 200)">
          {[40, 110, 180, 250, 320, 390].map((v) => (
            <g key={v}>
              <line x1="-200" y1={v} x2="600" y2={v} />
              <line x1={v} y1="-200" x2={v} y2="600" />
            </g>
          ))}
        </g>
        <line x1="-20" y1="300" x2="420" y2="60" stroke="#E6D3B3" strokeWidth="18" />
        <path d="M0 352 C 80 336, 140 366, 220 348 S 340 332, 400 346 L400 400 L0 400 Z" fill="#F3E4A6" />
        <text x="24" y="388" fontFamily="var(--font-redgato), sans-serif" fontSize="16" fill="#77160E">
          {mar}
        </text>
        <text x="26" y="44" fontFamily="var(--font-redgato), sans-serif" fontSize="18" fill="#77160E">
          {barri}
        </text>
      </svg>
      <div className="drop absolute top-[46%] left-1/2 -mt-[15%] -ml-[15%] aspect-square w-[30%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imatge} alt="" className="size-full object-contain drop-shadow-[0_14px_16px_rgb(56_56_58/0.3)]" />
      </div>
      <span className="absolute top-[64%] left-1/2 -translate-x-1/2 rounded-full bg-granat px-3.5 py-2 text-[13px] font-medium whitespace-nowrap text-groc">La Carmanyola</span>
    </div>
  );
}
