"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { euros } from "@/lib/format";
import { sumaParaula } from "@/app/(web)/comanda/actions";
import { desaCarnetComanda, mobilCarnet, preuLinia, recordaMobilCarnet, useCistella, type Comanda } from "./Cistella";
import { ResumConfirmada } from "./ResumConfirmada";

/** Les properes franges de 15 minuts, a partir de d'aquí a 10 minuts. */
function franges(n = 8): string[] {
  const d = new Date(Date.now() + 10 * 60_000);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
  return Array.from({ length: n }, (_, i) => {
    const f = new Date(d.getTime() + i * 15 * 60_000);
    return `${String(f.getHours()).padStart(2, "0")}:${String(f.getMinutes()).padStart(2, "0")}`;
  });
}

/** La comanda en un calaix lateral: cistella, recollida i confirmació, sense sortir de la pàgina. */
export function CalaixComanda() {
  const t = useTranslations("web.comanda");
  const { obert, tanca } = useCistella();
  const dialeg = useRef<HTMLDialogElement>(null);
  const [confirmada, setConfirmada] = useState<Comanda | null>(null);
  const [sumant, setSumant] = useState(false);
  const pathname = usePathname();

  // La comanda es confirma a l'instant; la paraula del carnet arriba quan respon el servidor.
  const enConfirmar = (c: Comanda, mobil: string) => {
    setConfirmada(c);
    if (!mobil) return;
    setSumant(true);
    sumaParaula({ mobil, linies: c.linies, total: c.total, hora: c.hora })
      .then((carnet) => {
        if (carnet.trobat) recordaMobilCarnet(mobil);
        desaCarnetComanda(c.id, carnet);
        setConfirmada((x) => (x?.id === c.id ? { ...x, carnet } : x));
      })
      .catch(() => {})
      .finally(() => setSumant(false));
  };

  // <dialog> en mode modal: atrapa el focus, tanca amb Esc i bloqueja la pàgina de sota.
  useEffect(() => {
    const d = dialeg.current;
    if (!d) return;
    if (obert && !d.open) d.showModal();
    if (!obert && d.open) d.close();
    document.documentElement.style.overflow = obert ? "hidden" : "";
  }, [obert]);

  // Si un enllaç del calaix porta a una altra pàgina, el calaix es tanca.
  useEffect(tanca, [pathname, tanca]);

  return (
    <dialog
      ref={dialeg}
      aria-labelledby="calaix-titol"
      onClose={() => {
        tanca();
        setConfirmada(null);
      }}
      onClick={(e) => e.target === e.currentTarget && tanca()}
      className="calaix fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(460px,100vw)] max-w-none border-0 bg-paper p-0 text-tinta backdrop:bg-tinta/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-linia px-5 py-4">
          <h2 id="calaix-titol" className="m-0 text-[26px] tracking-[-.02em]">
            {t("titol")}
          </h2>
          <button
            type="button"
            onClick={tanca}
            aria-label={t("tanca")}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-2xl text-tinta hover:bg-linia/60"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-8">
          {confirmada ? (
            <div className="flex flex-col gap-4">
              <ResumConfirmada comanda={confirmada} sumant={sumant} />
            </div>
          ) : (
            <FormComanda onConfirmada={enConfirmar} />
          )}
        </div>
      </div>
    </dialog>
  );
}

function FormComanda({ onConfirmada }: { onConfirmada: (c: Comanda, mobil: string) => void }) {
  const t = useTranslations("web.comanda");
  const { llesta, linies, total, canvia, confirma, tanca } = useCistella();
  const [hores, setHores] = useState<string[]>([]);
  const [hora, setHora] = useState("");
  const [nom, setNom] = useState("");
  const [mobil, setMobil] = useState("");

  useEffect(() => {
    // L'hora depèn del rellotge del client: es calcula quan s'obre el calaix.
    const h = franges();
    setHores(h);
    setHora(h[0]);
    setMobil(mobilCarnet());
  }, []);

  if (!llesta) return null;

  if (!linies.length) {
    return (
      <div className="flex flex-col items-center gap-5 px-5 py-16 text-center">
        <p className="m-0 text-[15px]">{t("buida")}</p>
        <Link
          href="/carta"
          onClick={(e) => {
            // Ja som a la carta: només cal tancar el calaix.
            if (location.pathname === "/carta") {
              e.preventDefault();
              tanca();
            }
          }}
          className="web-btn bg-granat text-groc"
        >
          {t("anaCarta")}
        </Link>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onConfirmada(confirma({ hora, nom: nom.trim() }), mobil.trim());
      }}
    >
      <section className="flex flex-col gap-1 rounded-[22px] bg-white p-5">
        {linies.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 border-b border-linia py-3 last:border-0">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-medium">{l.nom}</span>
              {l.detall && <span className="text-xs leading-[1.4] text-suau">{l.detall}</span>}
              {l.dinar && <span className="text-xs text-suau">{t("dinar", { nom: l.dinar.nom.toLowerCase() })}</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-full border border-linia">
                <button
                  type="button"
                  aria-label={t("treu", { plat: l.nom })}
                  onClick={() => canvia(l.id, l.quantitat - 1)}
                  className="size-9 cursor-pointer border-0 bg-transparent text-lg text-tinta"
                >
                  −
                </button>
                <span className="min-w-4 text-center text-sm font-medium">{l.quantitat}</span>
                <button
                  type="button"
                  aria-label={t("posa", { plat: l.nom })}
                  onClick={() => canvia(l.id, l.quantitat + 1)}
                  className="size-9 cursor-pointer border-0 bg-transparent text-lg text-tinta"
                >
                  +
                </button>
              </div>
              <span className="w-[72px] text-right text-[15px] whitespace-nowrap">{euros(preuLinia(l))}</span>
            </div>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t border-linia pt-3 text-base font-semibold">
          <span>{t("total")}</span>
          <span>{euros(total)}</span>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[22px] bg-white p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="hora" className="text-[13px] font-medium">
            {t("hora")}
          </label>
          <select id="hora" value={hora} onChange={(e) => setHora(e.target.value)} required className="h-[50px] rounded-xl border border-linia bg-white px-4 text-base">
            {hores.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nom-comanda" className="text-[13px] font-medium">
            {t("nom")}
          </label>
          <input
            id="nom-comanda"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            autoComplete="given-name"
            placeholder={t("nomPlaceholder")}
            className="h-[50px] rounded-xl border border-linia bg-white px-4 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mobil-carnet" className="text-[13px] font-medium">
            {t("mobilCarnet")} <span className="font-normal text-suau">{t("opcional")}</span>
          </label>
          <input
            id="mobil-carnet"
            type="tel"
            inputMode="tel"
            value={mobil}
            onChange={(e) => setMobil(e.target.value)}
            autoComplete="tel"
            placeholder={t("mobilPlaceholder")}
            aria-describedby="mobil-carnet-nota"
            className="h-[50px] rounded-xl border border-linia bg-white px-4 text-base"
          />
          <span id="mobil-carnet-nota" className="text-xs text-suau">
            {t("mobilCarnetNota")}
          </span>
        </div>
      </section>

      <button type="submit" disabled={!hora} className="cursor-pointer rounded-full border-0 bg-granat p-[17px] text-[13px] font-medium tracking-[.06em] text-paper uppercase disabled:opacity-60">
        {t("confirma", { total: euros(total) })}
      </button>
      <p className="m-0 px-1 text-xs leading-[1.6] text-suau">{t("nota")}</p>
    </form>
  );
}
