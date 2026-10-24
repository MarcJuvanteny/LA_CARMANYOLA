"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AiCard, AiEyebrow, Button, Card, CardTitle, PageHeader, Segmented, cx } from "@/components/panel/ui";
import type { Idioma } from "@/lib/data/carta";
import { paraulesProhibides, situacions, type SeccioVeu, type Situacio } from "@/lib/data/veu";
import { desaVeu } from "@/app/panel/actions";
import { provaVeu } from "./actions";

/** Les paraules prohibides les detecta el codi, no la IA. */
function detector(llista: string[]) {
  const paraules = [...new Set(llista.map((p) => p.trim().toLowerCase()).filter(Boolean))];
  if (!paraules.length) return null;
  const esc = paraules.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length);
  return new RegExp(`(?<![\\p{L}])(${esc.join("|")})(?![\\p{L}])`, "giu");
}

function Marcat({ text, re }: { text: string; re: RegExp | null }) {
  if (!re) return <>{text}</>;
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-granat px-1 text-groc">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function VeuView({ inicial }: { inicial: SeccioVeu[] }) {
  const t = useTranslations("panel.veu");
  const [seccions, setSeccions] = useState(inicial);
  const [desat, setDesat] = useState(inicial);
  const [situacio, setSituacio] = useState<Situacio>("recuperacio");
  const [idioma, setIdioma] = useState<Idioma>("ca");
  const [resultat, setResultat] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pendent, startTransition] = useTransition();
  const [textPropi, setTextPropi] = useState("");

  const canvis = JSON.stringify(seccions) !== JSON.stringify(desat);
  const veu = seccions.map((s) => `## ${s.titol}\n${s.text}`).join("\n\n");
  const prohibides = seccions.find((s) => s.id === "no")?.text ?? "";
  const re = useMemo(() => detector([...prohibides.split(","), ...paraulesProhibides]), [prohibides]);

  const trobades = (text: string) => (re ? [...new Set(Array.from(text.matchAll(re), (m) => m[0].toLowerCase()))] : []);

  const prova = () => {
    setError(false);
    startTransition(async () => {
      try {
        setResultat(await provaVeu(situacio, idioma, veu));
      } catch {
        setError(true);
      }
    });
  };

  const enResultat = resultat ? trobades(resultat) : [];
  const enPropi = trobades(textPropi);

  return (
    <>
      <PageHeader
        title={t("titol")}
        subtitle={t("subtitol")}
        actions={
          <>
            {!canvis && <span className="text-sm text-suau" role="status">{t("totDesat")}</span>}
            {canvis && (
              <Button variant="outline" onClick={() => setSeccions(desat)}>
                {t("desfes")}
              </Button>
            )}
            <Button
              onClick={() =>
                startTransition(async () => {
                  await desaVeu(seccions.map((s) => ({ id: s.id, text: s.text })));
                  setDesat(seccions);
                })
              }
              disabled={!canvis || pendent}
            >
              {t("desa")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_400px]">
        <Card className="self-start">
          <CardTitle>{t("prompt")}</CardTitle>
          <p className="mt-1 text-[0.85rem] text-suau">{t("promptNota")}</p>
          <div className="mt-5 space-y-5">
            {seccions.map((s) => (
              <div key={s.id}>
                <label htmlFor={`veu-${s.id}`} className="eyebrow mb-2 block text-tinta">
                  {s.titol}
                </label>
                <textarea
                  id={`veu-${s.id}`}
                  value={s.text}
                  rows={s.id === "si" || s.id === "no" ? 2 : 3}
                  onChange={(e) =>
                    setSeccions((ss) => ss.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)))
                  }
                  className={cx(
                    "w-full rounded-2xl border border-linia p-3.5 text-[0.92rem] leading-relaxed outline-none focus:border-granat",
                    s.id === "no" ? "bg-rosa-clar" : "bg-paper",
                  )}
                />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <AiCard>
            <AiEyebrow>{t("proves")}</AiEyebrow>
            <h2 className="mt-3 text-[1.4rem]">{t("provesTitol")}</h2>

            <p className="eyebrow mt-5 mb-2 text-granat" id="situacio">
              {t("situacio")}
            </p>
            <div role="group" aria-labelledby="situacio" className="flex flex-wrap gap-2">
              {situacions.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={situacio === s}
                  onClick={() => setSituacio(s)}
                  className={cx(
                    "min-h-9 rounded-full px-3.5 text-[0.82rem] font-medium",
                    situacio === s ? "bg-granat text-groc" : "bg-white/70 hover:bg-white",
                  )}
                >
                  {t(`situacions.${s}`)}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Segmented<Idioma>
                label={t("idioma")}
                value={idioma}
                onChange={setIdioma}
                options={[
                  { value: "ca", label: "Català" },
                  { value: "es", label: "Castellano" },
                  { value: "en", label: "English" },
                ]}
              />
              <Button onClick={prova} disabled={pendent}>
                {pendent ? t("escrivint") : t("prova")}
              </Button>
            </div>

            <div aria-live="polite">
              {error && <p className="mt-4 text-sm font-semibold text-granat">{t("error")}</p>}
              {resultat && !pendent && (
                <>
                  <p className="mt-4 rounded-2xl bg-white p-4 leading-relaxed">
                    <Marcat text={resultat} re={re} />
                  </p>
                  <p className="mt-2 text-[0.82rem]">
                    {enResultat.length ? t("trobades", { paraules: enResultat.join(", ") }) : t("netes")}
                  </p>
                </>
              )}
            </div>
            <p className="mt-4 text-[0.78rem]">{t("provesNota")}</p>
          </AiCard>

          <Card>
            <CardTitle>{t("revisa")}</CardTitle>
            <p className="mt-1 text-[0.85rem] text-suau">{t("revisaNota")}</p>
            <label htmlFor="text-propi" className="sr-only">
              {t("revisa")}
            </label>
            <textarea
              id="text-propi"
              value={textPropi}
              onChange={(e) => setTextPropi(e.target.value)}
              rows={3}
              placeholder={t("revisaPlaceholder")}
              className="mt-3 w-full rounded-2xl border border-linia bg-paper p-3.5 text-[0.92rem] outline-none focus:border-granat"
            />
            {textPropi.trim() && (
              <div aria-live="polite">
                <p className="mt-3 rounded-2xl border border-linia p-3.5 text-[0.92rem] leading-relaxed">
                  <Marcat text={textPropi} re={re} />
                </p>
                <p className={cx("mt-2 text-[0.82rem]", enPropi.length ? "font-semibold text-granat" : "text-suau")}>
                  {enPropi.length ? t("trobades", { paraules: enPropi.join(", ") }) : t("netes")}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
