"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Imagotip } from "@/components/brand/Imagotip";
import { recordaMobilCarnet } from "@/components/web/Cistella";
import { QrCarnet } from "@/components/web/QrCarnet";
import { faCarnet, type CarnetNou } from "./actions";

// En fer-se el carnet, el client rep una paraula de regal: carmanyola.
const RECUPERADES = 1;

export function CarnetView() {
  const t = useTranslations("web.carnet");
  const [nom, setNom] = useState("");
  const [fet, setFet] = useState<CarnetNou | null>(null);
  const [error, setError] = useState(false);
  const [desant, desa] = useTransition();

  return (
    <main className="mx-auto grid w-full max-w-[1100px] gap-6 px-5 pt-7 pb-16 md:grid-cols-2 md:items-center md:gap-[clamp(40px,6vw,90px)] md:px-[clamp(18px,4vw,56px)] md:pt-12">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="web-eb text-xs tracking-[.1em] text-granat">{t("eyebrow")}</span>
          <h1 className="m-0 text-[clamp(30px,4.4vw,64px)] leading-[1.08] tracking-[-.02em]">{t("titol")}</h1>
          <p className="m-0 text-[15px] leading-[1.6] md:text-[17px]">{t("text")}</p>
        </div>

        <div className="tex-granat flex flex-col gap-4 rounded-[20px] p-5 text-groc shadow-[0_12px_30px_rgb(119_22_14/0.22)] md:p-7">
          <div className="flex items-center justify-between">
            <Imagotip versio="groc" className="h-6" />
            <span className="text-xs font-medium">{t("nivell")}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-titol truncate text-[22px]">{nom.trim() || t("elTeuNom")}</span>
            <span className="shrink-0 text-[13px]">{t("comptador", { n: RECUPERADES })}</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className={`aspect-square rounded-full ${i < RECUPERADES ? "bg-groc" : "border border-groc"}`} />
            ))}
          </div>
          <span className="text-[13px] text-paper">
            {t.rich("recuperada", {
              paraula: "carmanyola",
              b: (c) => <strong className="font-semibold text-groc">{c}</strong>,
            })}
          </span>
        </div>
      </div>

      {fet ? (
        <div role="status" className="flex flex-col items-center gap-5 rounded-[22px] bg-white p-6 text-center md:p-8">
          <h2 className="m-0 text-2xl">{t("fet", { nom: nom.trim() })}</h2>
          {/* El QR és per a qui s'ha fet el carnet des de l'ordinador; al mòbil, el botó. */}
          <div className="hidden size-[220px] md:block [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: fet.qr }} />
          <p className="m-0 hidden max-w-[320px] text-[15px] leading-[1.6] md:block">{t("escaneja")}</p>
          <a href={fet.enllac} className="w-full rounded-full bg-granat p-[17px] text-[13px] font-medium tracking-[.06em] text-paper uppercase no-underline md:hidden">
            {t("desaMobil")}
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* A l'ordinador: el més ràpid és fer-se'l directament al mòbil */}
          <div className="hidden items-center gap-5 rounded-[22px] bg-white p-5 md:flex">
            <QrCarnet className="size-[128px] shrink-0" />
            <div className="flex flex-col gap-1.5">
              <span className="font-titol text-xl text-granat">{t("qrTitol")}</span>
              <span className="text-[15px] leading-[1.55]">{t("qrText")}</span>
            </div>
          </div>
          <span className="web-eb hidden text-center text-suau md:block">{t("oAqui")}</span>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const dades = new FormData(e.currentTarget);
              setError(false);
              desa(async () => {
                try {
                  const nou = await faCarnet(dades);
                  setFet(nou);
                  recordaMobilCarnet(String(dades.get("mobil")).trim());
                  // Al mòbil, directe al wallet: sense un altre botó.
                  if (/android|iphone|ipad/i.test(navigator.userAgent)) window.location.assign(nou.enllac);
                } catch {
                  setError(true);
                }
              });
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nom" className="text-[13px] font-medium">
                {t("nom")}
              </label>
              <input
                id="nom"
                name="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                autoComplete="given-name"
                placeholder={t("nomPlaceholder")}
                className="h-[50px] rounded-xl border border-linia bg-white px-4 text-base"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mobil" className="text-[13px] font-medium">
                {t("mobil")}
              </label>
              <input
                id="mobil"
                name="mobil"
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel"
                placeholder={t("mobilPlaceholder")}
                className="h-[50px] rounded-xl border border-linia bg-white px-4 text-base"
              />
              <span className="text-xs text-suau">{t("mobilNota")}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="correu" className="text-[13px] font-medium">
                {t("correu")} <span className="font-normal text-suau">{t("opcional")}</span>
              </label>
              <input id="correu" name="correu" type="email" autoComplete="email" placeholder={t("correuPlaceholder")} className="h-[50px] rounded-xl border border-linia bg-white px-4 text-base" />
            </div>
            <label className="flex items-start gap-3 text-[13px] leading-[1.55]">
              <input type="checkbox" name="consentiment" className="m-0 size-5 shrink-0 accent-granat" />
              {t("consentiment")}
            </label>
            <button
              type="submit"
              disabled={desant}
              className="cursor-pointer rounded-full border-0 bg-granat p-[17px] text-[13px] font-medium tracking-[.06em] text-paper uppercase disabled:opacity-60"
            >
              {desant ? t("desant") : t("desa")}
            </button>
            {error && (
              <p role="alert" className="m-0 text-[13px] text-granat">
                {t("error")}
              </p>
            )}
            <p id="privacitat" className="m-0 scroll-mt-28 text-xs leading-[1.6] text-suau">
              {t("nota")} <strong className="font-semibold">{t("privacitat")}:</strong> {t("privacitatText")}
            </p>
          </form>
        </div>
      )}
    </main>
  );
}
