import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ComandaPublica } from "@/lib/comandes/comandes";
import { euros } from "@/lib/format";

/** El resum d'una comanda pagada, a /comanda/[id]. Les dades surten de la base de dades. */
export function ResumConfirmada({ comanda }: { comanda: ComandaPublica }) {
  const carnet = comanda.carnet;
  const t = useTranslations("web.comanda");
  return (
    <>
      <header className="flex flex-col items-center gap-3.5 px-2 pt-4 pb-3 text-center">
        {/* El verd només marca l'estat (icona i fons); el text continua sent tinta. */}
        <span className="web-ok grid size-16 place-items-center rounded-full bg-verd text-white" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h1 className="m-0 text-[30px] tracking-[-.02em]">{t("confirmada")}</h1>
        <p className="m-0 inline-flex items-center gap-2 rounded-full bg-verd-clar px-3.5 py-1.5 text-[13px] font-medium">
          <span className="size-2 rounded-full bg-verd" aria-hidden="true" />
          {t("rebuda")}
        </p>
        <p className="m-0 text-[15px] leading-[1.6]">
          {comanda.hora && t.rich("recull", { hora: comanda.hora, b: (c) => <strong className="font-semibold">{c}</strong> })}
          <br />
          {t("adreca")}
        </p>
      </header>

      <section className="flex flex-col gap-2.5 rounded-[22px] bg-white p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="web-eb m-0 font-cos text-xs tracking-[.1em] text-granat">{t("numero", { n: comanda.numero ?? "—" })}</h2>
          <span className="text-[13px]">{comanda.nom}</span>
        </div>
        {comanda.linies.map((l) => (
          <div key={l.id} className="flex justify-between gap-3 text-[15px]">
            <span>
              {l.quantitat} × {l.nom}
              {l.detall && <span className="block text-xs text-suau">{l.detall}</span>}
              {l.dinar && <span className="block text-xs text-suau">{t("dinar", { nom: l.dinar.nom.toLowerCase() })}</span>}
            </span>
            <span className="shrink-0 whitespace-nowrap">{euros(l.preu * l.quantitat)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-linia pt-3 text-base font-semibold">
          <span>{t("total")}</span>
          <span>{euros(comanda.total)}</span>
        </div>
      </section>

      <a href={`/comanda/${comanda.id}/tiquet`} download className="web-btn self-center border-[1.5px] border-granat text-granat">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
        </svg>
        {t("descarregaTiquet")}
      </a>

      {/* La paraula del carnet: si ha escrit el mòbil, ja s'ha sumat; si no, la sumarà el QR de la faixa. */}
      {comanda.mobil && !comanda.teCarnet ? (
        // Mòbil sense carnet: no és cap error (el número serveix per si hi ha cap problema). Nota discreta i invitació.
        <p className="m-0 px-4 text-center text-[13px] leading-[1.5] text-suau">
          {t.rich("noCarnet", {
            mobil: comanda.mobil,
            a: (c) => (
              <Link href="/carnet" className="font-medium text-granat underline underline-offset-2">
                {c}
              </Link>
            ),
          })}
        </p>
      ) : (
        <p role="status" className="m-0 rounded-[18px] bg-groc px-5 py-4 text-center text-[15px] leading-[1.5] text-granat">
          {carnet
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
            : t("faixa")}
          {carnet?.complet && <span className="mt-1 block font-semibold">{t("complet")}</span>}
        </p>
      )}
    </>
  );
}
