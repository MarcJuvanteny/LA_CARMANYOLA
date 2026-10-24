"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PROPOSTES, usePanelState } from "@/components/panel/PanelState";
import {
  AiCard,
  AiEyebrow,
  Button,
  Card,
  CardTitle,
  Meter,
  PageHeader,
  Pill,
  TableWrap,
  cx,
  td,
  th,
} from "@/components/panel/ui";
import { percent } from "@/lib/format";

const AVIS = PROPOSTES.queQueda[0];
const PRODUCCIO = PROPOSTES.vendes[0];

/** "a, b i c" */
function llista(items: string[], i: string) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${i} ${items.at(-1)}`;
}

interface Fila {
  id: number;
  nom: string;
  fets: number;
  venuts: number;
  previsio: number;
  inclos: boolean | null;
}

interface Props {
  ara: { subtitol: string; temps: string; hora: string };
  plats: Fila[];
  proposta: { mestres: number; encert: number };
  produccio: { titol: string; items: { id: number; nom: string; motiu: string; abans: number; despres: number }[] };
  avis: { missatge: string } | null;
}

export function QueQuedaView({ ara, plats: queQueda, proposta: propostaQueQueda, produccio: produccioDema, avis }: Props) {
  const t = useTranslations("panel.queQueda");
  const { resolts, resol, desfes } = usePanelState();
  // Només guardem el que l'amo canvia; la resta ve del servidor i s'actualitza amb cada comanda.
  const [correccions, setCorreccions] = useState<Record<number, number>>({});
  const [triats, setTriats] = useState<Record<number, boolean>>({});
  const [corregint, setCorregint] = useState(false);

  const avisActiu = resolts[AVIS] === "aprovada";
  const produccio = resolts[PRODUCCIO];
  const quantitats = queQueda.map((f) => correccions[f.id] ?? f.previsio);
  const inclosos = queQueda.map((f, i) => triats[f.id] ?? f.inclos ?? quantitats[i] >= 3);

  const alAvis = queQueda
    .map((f, i) => ({ ...f, n: quantitats[i], inclos: inclosos[i] }))
    .filter((f) => f.inclos && f.n > 0);
  const missatge = avisActiu && avis
    ? avis.missatge
    : alAvis.length
      ? t("missatge", { plats: llista(alAvis.map((f) => `${f.n} ${f.nom}`), t("i")) })
      : t("missatgeBuit");

  const activa = () => {
    setCorregint(false);
    resol(AVIS, "aprovada", { missatge, quantitats: correccions, inclosos: Object.fromEntries(queQueda.map((f, i) => [f.id, inclosos[i]])) });
  };

  return (
    <>
      <PageHeader title={t("titol")} subtitle={ara.subtitol} actions={<Pill>{ara.temps}</Pill>} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_390px]">
        <Card>
          <CardTitle>{t("quedara", { hora: ara.hora })}</CardTitle>
          <TableWrap>
            <table className="mt-4 w-full min-w-[600px] text-[0.92rem]">
              <thead>
                <tr>
                  <th className={th}>{t("plat")}</th>
                  <th className={th}>{t("fets")}</th>
                  <th className={th}>{t("venuts")}</th>
                  <th className={th}>
                    <span className="sr-only">{t("venutsBarra")}</span>
                  </th>
                  <th className={th}>{t("previsio")}</th>
                  <th className={th}>
                    <span className="sr-only">{t("avis")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {queQueda.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`${td} text-suau`}>
                      {t("senseProduccio")}
                    </td>
                  </tr>
                )}
                {queQueda.map((f, i) => {
                  const n = quantitats[i];
                  return (
                    <tr key={f.nom}>
                      <td className={td}>{f.nom}</td>
                      <td className={`${td} text-suau`}>{f.fets}</td>
                      <td className={`${td} text-suau`}>{f.venuts}</td>
                      <td className={`${td} w-[22%]`}>
                        <Meter value={f.venuts / f.fets} />
                      </td>
                      <td className={td}>
                        {corregint ? (
                          <input
                            type="number"
                            min={0}
                            max={f.fets - f.venuts}
                            value={n}
                            aria-label={t("corregeixPlat", { plat: f.nom })}
                            onChange={(e) => {
                              const v = Math.max(0, Math.min(f.fets - f.venuts, Number(e.target.value) || 0));
                              setCorreccions((c) => ({ ...c, [f.id]: v }));
                            }}
                            className="h-10 w-16 rounded-lg border border-linia px-2 text-center font-semibold"
                          />
                        ) : n > 0 ? (
                          <span className="font-titol text-[1.3rem] text-granat">{n}</span>
                        ) : (
                          <span aria-label="0" className="inline-block size-3 rounded-full bg-suau/40" />
                        )}
                      </td>
                      <td className={`${td} text-right`}>
                        {n > 0 && !avisActiu ? (
                          <button
                            type="button"
                            aria-pressed={inclosos[i]}
                            onClick={() => setTriats((s) => ({ ...s, [f.id]: !inclosos[i] }))}
                            className={cx(
                              "min-h-9 whitespace-nowrap rounded-full px-3.5 text-[0.8rem] font-medium transition-colors",
                              inclosos[i] ? "bg-groc text-granat" : "border border-linia text-suau hover:border-tinta/40",
                            )}
                          >
                            {inclosos[i] ? t("entra") : t("afegeix")}
                          </button>
                        ) : n > 0 ? (
                          <span className="text-[0.8rem] text-suau">{inclosos[i] ? t("alAvis") : t("foraAvis")}</span>
                        ) : (
                          <span className="text-[0.8rem] text-suau">{t("noEnQuedara")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
          <p className="mt-4 text-[0.85rem] text-suau">{t("nota")}</p>
        </Card>

        <AiCard className="self-start">
          <AiEyebrow>{t("iaEyebrow")}</AiEyebrow>
          <h2 className="mt-3 text-[1.6rem]">{t("obre", { hora: ara.hora })}</h2>
          <p className="mt-3 text-[0.92rem]">
            {t.rich("perAls", { n: propostaQueQueda.mestres, b: (c) => <strong className="font-semibold">{c}</strong> })}
          </p>
          <p className="mt-4 rounded-2xl bg-white p-4 leading-relaxed" aria-live="polite">
            {missatge}
          </p>
          {avisActiu ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm" role="status">
              <span className="font-semibold">{t("activat", { hora: ara.hora, n: propostaQueQueda.mestres })}</span>
              <button type="button" className="min-h-11 underline" onClick={() => desfes(AVIS)}>
                {t("desfes")}
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={activa} disabled={alAvis.length === 0}>
                {t("activa")}
              </Button>
              <Button variant="ghost" aria-pressed={corregint} onClick={() => setCorregint((c) => !c)}>
                {corregint ? t("fet") : t("corregeix")}
              </Button>
            </div>
          )}
          <p className="mt-4 text-[0.85rem]">
            {t.rich("encert", { pct: percent(propostaQueQueda.encert), b: (c) => <strong className="font-semibold">{c}</strong> })}
          </p>
        </AiCard>
      </div>

      <Card className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AiEyebrow>{t("dema")}</AiEyebrow>
          <p className="text-[0.85rem] text-suau">{produccioDema.titol}</p>
        </div>
        <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-3">
          {produccioDema.items.map((p) => (
            <li key={p.nom} className="flex items-center justify-between gap-3 border-b border-linia pb-4">
              <div>
                <p className="font-medium">{p.nom}</p>
                <p className="text-[0.8rem] text-suau">{p.motiu}</p>
              </div>
              <p className="flex shrink-0 items-center gap-2.5 text-[1rem]" aria-label={t("deA", { abans: p.abans, despres: p.despres })}>
                <span className="text-suau">{p.abans}</span>
                <span aria-hidden>→</span>
                <span className="font-titol text-[1.3rem] text-granat">{p.despres}</span>
              </p>
            </li>
          ))}
        </ul>
        {produccio ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm" role="status">
            <span className="font-semibold">{produccio === "aprovada" ? t("enviatCuina") : t("decideixXef")}</span>
            <button type="button" className="min-h-11 underline" onClick={() => desfes(PRODUCCIO)}>
              {t("desfes")}
            </button>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => resol(PRODUCCIO, "aprovada")}>{t("enviaCuina")}</Button>
            <Button variant="outline" onClick={() => resol(PRODUCCIO, "ara-no")}>
              {t("xef")}
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
