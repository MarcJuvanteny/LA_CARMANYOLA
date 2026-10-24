"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePanelState } from "@/components/panel/PanelState";
import {
  AiCard,
  AiEyebrow,
  Button,
  ButtonLink,
  Card,
  CardTitle,
  NumberedList,
  PageHeader,
  Pill,
  TableWrap,
  cx,
  td,
  th,
} from "@/components/panel/ui";
import { estacioDe, type AvisPadro, type Estacio, type EstatPadro, type Ingredient } from "@/lib/data/padro";

const clau = (id: string) => `padro:${id}`;
const estacions: Estacio[] = ["tardor", "hivern", "primavera", "estiu"];

const estils: Record<EstatPadro, string> = {
  empadronat: "bg-granat text-groc",
  "alta-proposada": "bg-groc text-granat",
  "baixa-proposada": "bg-groc text-granat",
  "ve-aviat": "border border-linia bg-white text-tinta",
  "de-baixa": "bg-crema text-suau",
};

const estacioActual = estacioDe();

export function PadroView({ ingredients, avisos }: { ingredients: Ingredient[]; avisos: AvisPadro[] }) {
  const t = useTranslations("panel.padro");
  const { resolts, resol, desfes } = usePanelState();
  const [anuncis, setAnuncis] = useState<Record<string, string>>({});
  const [editant, setEditant] = useState<string | null>(null);

  // L'estat que veu l'amo després d'aprovar una alta o una baixa.
  const estatDe = (ing: Ingredient): EstatPadro => {
    const avis = avisos.find((a) => a.ingredient === ing.id);
    if (avis && resolts[clau(avis.id)] === "aprovada") return avis.tipus === "alta" ? "empadronat" : "de-baixa";
    return ing.estat;
  };

  const empadronats = ingredients.filter((i) => estatDe(i) === "empadronat").length;

  return (
    <>
      <PageHeader
        title={t("titol")}
        subtitle={t("subtitol", { n: empadronats })}
        actions={<Pill>{t(`estacio.${estacioActual}`)} {new Date().getFullYear()}</Pill>}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
        <Card className="self-start">
          <CardTitle>{t("cens")}</CardTitle>
          <TableWrap>
            <table className="mt-4 w-full min-w-[640px] text-[0.92rem]">
              <thead>
                <tr>
                  <th className={th}>{t("ingredient")}</th>
                  <th className={th}>{t("comarca")}</th>
                  <th className={th}>{t("estat")}</th>
                  <th className={th}>{t("alta")}</th>
                  <th className={th}>{t("baixa")}</th>
                  <th className={th}>{t("plats")}</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => {
                  const e = estatDe(ing);
                  return (
                    <tr key={ing.id} className={cx(e === "de-baixa" && "text-suau")}>
                      <td className={`${td} font-medium`}>{ing.nom}</td>
                      <td className={td}>{ing.comarca ?? <span className="text-suau">{t("perConfirmar")}</span>}</td>
                      <td className={td}>
                        <span className={cx("inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[0.75rem] font-semibold", estils[e])}>
                          {t(`estats.${e}`)}
                        </span>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{ing.alta ?? "—"}</td>
                      <td className={`${td} whitespace-nowrap`}>{ing.baixa ?? "—"}</td>
                      <td className={td}>{ing.plats.length ? ing.plats.join(", ") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
          <p className="mt-4 text-[0.82rem] text-suau">{t("nota")}</p>
        </Card>

        <div className="space-y-5">
          {avisos.map((a) => {
            const estat = resolts[clau(a.id)];
            const anunci = anuncis[a.id] ?? a.anunci;
            return (
              <AiCard key={a.id}>
                <AiEyebrow>
                  {t("proposta")} · {t(a.tipus === "alta" ? "tipusAlta" : "tipusBaixa")}
                </AiEyebrow>
                <h2 className="mt-3 text-[1.4rem]">{a.titol}</h2>
                <NumberedList items={a.punts} className="mt-4" />
                <p className="eyebrow mt-5 mb-2 text-granat">{t("anunci")}</p>
                {editant === a.id ? (
                  <>
                    <label htmlFor={`anunci-${a.id}`} className="sr-only">
                      {t("anunci")}
                    </label>
                    <textarea
                      id={`anunci-${a.id}`}
                      value={anunci}
                      rows={4}
                      onChange={(e) => setAnuncis((s) => ({ ...s, [a.id]: e.target.value }))}
                      className="w-full rounded-2xl border border-granat/20 bg-white p-3.5 text-[0.92rem] leading-relaxed outline-none focus:border-granat"
                    />
                  </>
                ) : (
                  <p className="rounded-2xl bg-white p-4 text-[0.92rem] leading-relaxed">{anunci}</p>
                )}

                {estat ? (
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm" role="status">
                    <span className="font-semibold">
                      {estat === "aprovada" ? t(a.tipus === "alta" ? "altaFeta" : "baixaFeta") : t("perMesEndavant")}
                    </span>
                    <button type="button" className="min-h-11 underline" onClick={() => desfes(clau(a.id))}>
                      {t("desfes")}
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button onClick={() => { setEditant(null); resol(clau(a.id), "aprovada"); }}>
                      {t(a.tipus === "alta" ? "aprovaAlta" : "aprovaBaixa")}
                    </Button>
                    <Button variant="ghost" aria-pressed={editant === a.id} onClick={() => setEditant(editant === a.id ? null : a.id)}>
                      {editant === a.id ? t("fet") : t("edita")}
                    </Button>
                    <Button variant="ghost" onClick={() => resol(clau(a.id), "ara-no")}>
                      {t("araNo")}
                    </Button>
                  </div>
                )}
                {a.campanya && estat === "aprovada" && (
                  <ButtonLink href={`/panel/campanyes?c=${a.campanya}`} variant="outline" className="mt-3">
                    {t("veureCampanya")}
                  </ButtonLink>
                )}
              </AiCard>
            );
          })}
        </div>
      </div>

      <Card className="mt-5">
        <CardTitle>{t("calendari")}</CardTitle>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {estacions.map((es) => {
            const actual = es === estacioActual;
            const llista = ingredients.filter((i) => i.estacio === es);
            return (
              <li
                key={es}
                className={cx("rounded-2xl p-4", actual ? "border-2 border-granat bg-white" : "border border-linia bg-paper/60")}
                aria-current={actual ? "true" : undefined}
              >
                <p className="flex items-center justify-between">
                  <span className="font-titol text-[1.15rem]">{t(`estacio.${es}`)}</span>
                  {actual && <span className="eyebrow text-granat">{t("ara")}</span>}
                </p>
                <ul className="mt-3 space-y-1.5 text-[0.9rem]">
                  {llista.map((i) => (
                    <li key={i.id} className="flex justify-between gap-2">
                      <span>{i.nom}</span>
                      <span className="text-right text-[0.8rem] text-suau">{i.comarca ?? ""}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
