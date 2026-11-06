"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { reescriuQueQueda } from "@/app/panel/accions-ia";
import { Isotip } from "@/components/brand/Isotip";
import { PROPOSTES, usePanelState } from "@/components/panel/PanelState";
import { Button, Card, cx } from "@/components/panel/ui";
import { percent } from "@/lib/format";

const AVIS = PROPOSTES.queQueda[0];

/** "a, b i c" */
function llista(items: string[], i: string) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${i} ${items.at(-1)}`;
}

export interface DadesQueQueda {
  ara: { subtitol: string; temps: string; hora: string };
  plats: { id: number; nom: string; fets: number; venuts: number; previsio: number; inclos: boolean | null }[];
  proposta: { destinataris: number; encert: number };
  avis: { missatge: string } | null;
}

/**
 * L'hora del Què Queda, dins de la Carta: quins plats en quedaran a l'última mitja hora del servei
 * i l'avís als clients amb carnet. Plegat per defecte; s'obre amb "Prepara l'avís" o amb #que-queda.
 */
export function QueQueda({ ara, plats, proposta, avis }: DadesQueQueda) {
  const t = useTranslations("panel.queQueda");
  const { resolts, resol, desfes } = usePanelState();
  const [obert, setObert] = useState(false);
  // Només guardem el que l'amo canvia; la resta ve del servidor i s'actualitza amb cada comanda.
  const [correccions, setCorreccions] = useState<Record<number, number>>({});
  const [triats, setTriats] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (window.location.hash === "#que-queda") setObert(true);
  }, []);

  const avisActiu = resolts[AVIS] === "aprovada";
  const quantitats = plats.map((f) => correccions[f.id] ?? f.previsio);
  const inclosos = plats.map((f, i) => triats[f.id] ?? f.inclos ?? quantitats[i] >= 3);
  const alAvis = plats.map((f, i) => ({ ...f, n: quantitats[i], inclos: inclosos[i] })).filter((f) => f.inclos && f.n > 0);
  const ambRacions = quantitats.filter((n) => n > 0).length;

  const base = alAvis.length ? t("missatge", { plats: llista(alAvis.map((f) => `${f.n} ${f.nom}`), t("i")) }) : t("missatgeBuit");
  // El text de la IA només val per a les quantitats amb què s'ha escrit: si l'amo les corregeix, torna la plantilla.
  const signatura = alAvis.map((f) => `${f.n}×${f.id}`).join(",");
  const [ia, setIa] = useState<{ signatura: string; text: string } | null>(null);
  const [errorIa, setErrorIa] = useState(false);
  const [reescrivint, startReescriu] = useTransition();
  const missatge = avisActiu && avis ? avis.missatge : ia?.signatura === signatura ? ia.text : base;

  const reescriu = () => {
    setErrorIa(false);
    startReescriu(async () => {
      const text = await reescriuQueQueda(alAvis.map((f) => ({ n: f.n, nom: f.nom })), base);
      if (text) setIa({ signatura, text });
      else setErrorIa(true);
    });
  };

  const activa = () =>
    resol(AVIS, "aprovada", { missatge, quantitats: correccions, inclosos: Object.fromEntries(plats.map((f, i) => [f.id, inclosos[i]])) });

  return (
    <Card id="que-queda" className="mb-5 scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper" aria-hidden>
            <Isotip className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-cos text-[1.05rem] font-semibold">{t("titolCarta", { hora: ara.hora })}</h2>
            <p className="text-[0.85rem] text-suau">
              {avisActiu
                ? t("activat", { hora: ara.hora, n: proposta.destinataris })
                : plats.length
                  ? t("resumCarta", { n: ambRacions, temps: ara.temps })
                  : t("senseProduccio")}
            </p>
          </div>
        </div>
        {avisActiu ? (
          <button type="button" className="min-h-11 text-sm font-medium underline underline-offset-2" onClick={() => desfes(AVIS)}>
            {t("desfes")}
          </button>
        ) : (
          plats.length > 0 && (
            <Button variant={obert ? "ghost" : "primary"} aria-expanded={obert} aria-controls="que-queda-cos" onClick={() => setObert((o) => !o)}>
              {obert ? t("amaga") : t("prepara")}
            </Button>
          )
        )}
      </div>

      {obert && !avisActiu && (
        <div id="que-queda-cos" className="mt-5 grid grid-cols-1 gap-6 border-t border-linia pt-5 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-[0.92rem]">
              <span className="eyebrow pb-2 text-suau">{t("plat")}</span>
              <span className="eyebrow pb-2 text-right text-suau">{t("quedaran")}</span>
              <span className="eyebrow pb-2 text-suau">{t("avis")}</span>
              {plats.map((f, i) => {
                const n = quantitats[i];
                const max = Math.max(0, f.fets - f.venuts);
                return (
                  <div key={f.id} className="contents">
                    <div className="min-w-0 border-t border-linia py-2.5">
                      <p className="font-medium">{f.nom}</p>
                      <p className="text-[0.78rem] text-suau">{t("fetsVenuts", { fets: f.fets, venuts: f.venuts })}</p>
                    </div>
                    <div className="border-t border-linia py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        max={max}
                        value={n}
                        aria-label={t("corregeixPlat", { plat: f.nom })}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(max, Number(e.target.value) || 0));
                          setCorreccions((c) => ({ ...c, [f.id]: v }));
                        }}
                        className="h-10 w-16 rounded-lg border border-linia px-2 text-center font-semibold tabular-nums"
                      />
                    </div>
                    <div className="border-t border-linia py-2.5">
                      <label className={cx("flex min-h-10 items-center gap-2 text-[0.85rem]", n === 0 && "text-suau")}>
                        <input
                          type="checkbox"
                          checked={n > 0 && inclosos[i]}
                          disabled={n === 0}
                          onChange={() => setTriats((s) => ({ ...s, [f.id]: !inclosos[i] }))}
                          className="size-5 accent-granat"
                        />
                        <span className="sr-only">{t("entraPlat", { plat: f.nom })}</span>
                        <span aria-hidden>{n === 0 ? t("noEnQuedara") : t("entra")}</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[0.8rem] text-suau">{t("nota")}</p>
          </div>

          <div className="min-w-0">
            <p className="eyebrow mb-2 text-suau">{t("elMissatge")}</p>
            <p className="rounded-2xl bg-paper p-4 text-[0.95rem] leading-relaxed" aria-live="polite">
              {missatge}
            </p>
            <button
              type="button"
              onClick={reescriu}
              disabled={reescrivint || alAvis.length === 0}
              className="mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.82rem] font-medium text-suau hover:bg-paper hover:text-tinta disabled:opacity-50"
            >
              <Isotip className="size-3.5" />
              {reescrivint ? t("iaEscrivint") : t("iaReescriu")}
            </button>
            {errorIa && <p className="mt-1 text-sm font-semibold text-granat">{t("iaNoRespon")}</p>}
            <p className="mt-4 text-[0.85rem]">
              {t.rich("perAls", { n: proposta.destinataris, b: (c) => <strong className="font-semibold">{c}</strong> })}
            </p>
            <Button className="mt-4 w-full" onClick={activa} disabled={alAvis.length === 0}>
              {t("activa")}
            </Button>
            <p className="mt-3 text-[0.8rem] text-suau">
              {t.rich("encert", { pct: percent(proposta.encert), b: (c) => <strong className="font-semibold">{c}</strong> })}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
