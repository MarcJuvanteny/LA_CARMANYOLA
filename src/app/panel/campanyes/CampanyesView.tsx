"use client";

import { Fragment, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { demanaCampanya } from "@/app/panel/actions";
import { useTranslations } from "next-intl";
import { Isotip } from "@/components/brand/Isotip";
import { usePanelState, type Resolucio } from "@/components/panel/PanelState";
import {
  AiCard,
  AiEyebrow,
  Button,
  Card,
  CardTitle,
  NumberedList,
  PageHeader,
  Segmented,
  cx,
} from "@/components/panel/ui";
import type { Campanya, To } from "@/lib/data/campanyes";
import type { Idioma } from "@/lib/data/carta";
import { percent } from "@/lib/format";

interface Props {
  campanyes: Campanya[];
  peticions: { id: number; goal: string }[];
  inicial: string;
  exemple: { nom: string; paraula: string };
}

interface EstatMissatge {
  to: To;
  idioma: Idioma;
  editat: Partial<Record<Idioma, string>>;
  editant: boolean;
  wallet: boolean;
  correu: boolean;
}

const clau = (id: string) => `campanya:${id}`;

export function CampanyesView({ campanyes, peticions, inicial, exemple }: Props) {
  const t = useTranslations("panel.campanyes");
  const { resolts, resol, desfes, pendents } = usePanelState();
  const [seleccio, setSeleccio] = useState(inicial);
  const [missatges, setMissatges] = useState<Record<string, EstatMissatge>>({});
  const [demanant, setDemanant] = useState(false);
  const router = useRouter();
  const [enviant, startTransition] = useTransition();

  const perRevisar = campanyes.filter((c) => c.estat === "esborrany");
  const enviades = campanyes.filter((c) => c.estat === "enviada");
  const actual = campanyes.find((c) => c.id === seleccio) ?? campanyes[0];

  const estatDe = (c: Campanya): Resolucio | "esborrany" | "enviada" =>
    c.estat === "enviada" ? "enviada" : (resolts[clau(c.id)] ?? "esborrany");

  const m: EstatMissatge = missatges[actual.id] ?? {
    to: "original",
    idioma: "ca",
    editat: {},
    editant: false,
    wallet: actual.canals.wallet,
    correu: actual.canals.correu,
  };
  const setM = (patch: Partial<EstatMissatge>) => setMissatges((s) => ({ ...s, [actual.id]: { ...m, ...patch } }));
  const text = m.editat[m.idioma] ?? actual.missatges[m.to][m.idioma];

  const demana = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const objectiu = String(form.get("objectiu") ?? "").trim();
    if (!objectiu) return;
    startTransition(async () => {
      await demanaCampanya(objectiu);
      setDemanant(false);
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        title={t("titol")}
        subtitle={t("subtitol")}
        actions={
          <Button onClick={() => setDemanant((v) => !v)} aria-expanded={demanant}>
            <Isotip versio="groc" className="size-4" />
            {t("demana")}
          </Button>
        }
      />

      {demanant && (
        <AiCard className="mb-5">
          <form onSubmit={demana} className="space-y-3">
            <label htmlFor="objectiu" className="eyebrow block text-granat">
              {t("demanaLabel")}
            </label>
            <textarea
              id="objectiu"
              name="objectiu"
              rows={2}
              required
              placeholder={t("demanaPlaceholder")}
              className="w-full rounded-2xl border border-granat/20 bg-white/80 p-3.5 text-[0.95rem] outline-none focus:border-granat"
            />
            <p className="text-[0.82rem]">{t("demanaNota")}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={enviant}>
                {t("demanaEnvia")}
              </Button>
              <Button variant="ghost" onClick={() => setDemanant(false)}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        </AiCard>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        {/* Llista */}
        <div className="space-y-6">
          <section>
            <h2 className="eyebrow mb-3 font-cos text-tinta">
              {t("perRevisar")} · {pendents(perRevisar.map((c) => clau(c.id)))}
            </h2>
            <ul className="space-y-2.5">
              {peticions.map(({ id, goal: d }) => (
                <li key={id} className="rounded-2xl border border-dashed border-granat/40 bg-white/60 p-4">
                  <p className="eyebrow text-granat">{t("enPreparacio")}</p>
                  <p className="mt-1 line-clamp-2 text-[0.9rem]">{d}</p>
                  <p className="mt-1 text-[0.78rem] text-suau">{t("aquestaNit")}</p>
                </li>
              ))}
              {perRevisar.map((c) => (
                <ItemLlista key={c.id} c={c} actiu={c.id === actual.id} estat={estatDe(c)} onClick={() => setSeleccio(c.id)} />
              ))}
            </ul>
          </section>
          <section>
            <h2 className="eyebrow mb-3 font-cos text-tinta">{t("enviades")}</h2>
            <ul className="space-y-2.5">
              {enviades.map((c) => (
                <ItemLlista key={c.id} c={c} actiu={c.id === actual.id} estat="enviada" onClick={() => setSeleccio(c.id)} />
              ))}
            </ul>
          </section>
        </div>

        {/* Detall */}
        {actual.estat === "enviada" ? (
          <Resultat c={actual} />
        ) : (
          <div className="min-w-0 space-y-5">
            <AiCard>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <AiEyebrow>
                  {t("proposta")} · {t(`tipus.${actual.tipus}`)}
                </AiEyebrow>
                <span className="text-[0.82rem]">{t(`estat.${estatDe(actual)}`)}</span>
              </div>
              <h2 className="mt-3 text-[1.9rem]">{actual.titol}</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {actual.xips.map((x) => (
                  <li key={x} className="rounded-full bg-white/70 px-3.5 py-1.5 text-[0.82rem]">
                    {x}
                  </li>
                ))}
              </ul>
              <p className="eyebrow mt-5 mb-3 text-granat">{t("perQue")}</p>
              <NumberedList items={actual.perQue} />
            </AiCard>

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{t("missatge")}</CardTitle>
                <Segmented<Idioma>
                  label={t("idioma")}
                  value={m.idioma}
                  onChange={(idioma) => setM({ idioma })}
                  options={[
                    { value: "ca", label: "Català" },
                    { value: "es", label: "Castellano" },
                    { value: "en", label: "English" },
                  ]}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_250px]">
                <div className="min-w-0">
                  {m.editant ? (
                    <>
                      <label htmlFor="missatge" className="sr-only">
                        {t("missatge")}
                      </label>
                      <textarea
                        id="missatge"
                        value={text}
                        onChange={(e) => setM({ editat: { ...m.editat, [m.idioma]: e.target.value } })}
                        rows={6}
                        className="w-full rounded-2xl border border-linia bg-paper p-4 text-[0.98rem] leading-relaxed outline-none focus:border-granat"
                      />
                      <p className="mt-1 text-[0.78rem] text-suau">{t("variables")}</p>
                    </>
                  ) : (
                    <p className="min-h-36 rounded-2xl bg-paper p-4 text-[0.98rem] leading-relaxed">
                      <Variables text={text} />
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.82rem]">
                    <span className="text-suau">{t("demanali")}</span>
                    {(["curt", "calid", "senseExtra"] as To[]).map((to) => (
                      <button
                        key={to}
                        type="button"
                        aria-pressed={m.to === to}
                        onClick={() => setM({ to: m.to === to ? "original" : to, editat: {} })}
                        className={cx(
                          "min-h-9 rounded-full border px-3 font-medium",
                          m.to === to ? "border-tinta bg-tinta text-white" : "border-linia hover:border-tinta/40",
                        )}
                      >
                        {to === "senseExtra" ? (actual.senseExtra ?? t("to.senseExtra")) : t(`to.${to}`)}
                      </button>
                    ))}
                    <button
                      type="button"
                      aria-pressed={m.editant}
                      onClick={() => setM({ editant: !m.editant })}
                      className={cx(
                        "min-h-9 rounded-full border px-3 font-medium",
                        m.editant ? "border-tinta bg-tinta text-white" : "border-linia hover:border-tinta/40",
                      )}
                    >
                      ✎ {m.editant ? t("fetEdicio") : t("editaMa")}
                    </button>
                  </div>

                  <fieldset className="mt-5 border-t border-linia pt-4">
                    <legend className="sr-only">{t("perOn")}</legend>
                    <p aria-hidden className="eyebrow mb-2 text-tinta">
                      {t("perOn")}
                    </p>
                    <Check checked={m.wallet} onChange={(wallet) => setM({ wallet })} label={t("wallet")} />
                    <Check
                      checked={m.correu}
                      onChange={(correu) => setM({ correu })}
                      label={t("correu", { n: actual.canals.correuAcceptat })}
                    />
                  </fieldset>

                  <div className="mt-4 border-t border-linia pt-4">
                    <p className="eyebrow mb-2 text-tinta">{t("quan")}</p>
                    <p className="flex items-start gap-2 text-[0.92rem]">
                      <Isotip className="mt-0.5 size-4 shrink-0" />
                      <span>
                        {actual.quan.text} <span className="text-suau">{actual.quan.motiu}</span>
                      </span>
                    </p>
                  </div>
                </div>

                <Telefon
                  data={actual.previsualitzacio.data}
                  hora={actual.previsualitzacio.hora}
                  text={omple(text, exemple)}
                  etiqueta={t("previsualitzacio")}
                  ara={t("ara")}
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-linia pt-5">
                <Accions
                  estat={estatDe(actual)}
                  quan={actual.quan.text}
                  senseCanal={!m.wallet && !m.correu}
                  desat={resolts[clau(actual.id)] === "esborrany"}
                  onResol={(r) => resol(clau(actual.id), r, { editat: m.editat, wallet: m.wallet, correu: m.correu })}
                  onDesfes={() => desfes(clau(actual.id))}
                />
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

function ItemLlista({
  c,
  actiu,
  estat,
  onClick,
}: {
  c: Campanya;
  actiu: boolean;
  estat: string;
  onClick: () => void;
}) {
  const t = useTranslations("panel.campanyes");
  const ia = c.estat === "esborrany";
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={actiu ? "true" : undefined}
        className={cx(
          "w-full rounded-2xl border p-4 text-left transition-colors",
          actiu && ia && "border-groc-intens bg-groc",
          actiu && !ia && "border-tinta/40 bg-white",
          !actiu && "border-linia bg-white hover:border-tinta/30",
          (estat === "descartada" || estat === "ara-no") && "opacity-60",
        )}
      >
        <p className="eyebrow text-granat">{t(`tipus.${c.tipus}`)}</p>
        <p className="font-titol mt-1 text-[1.02rem]">{c.titol}</p>
        <p className="mt-1 text-[0.78rem] text-suau">
          {c.resultat
            ? t("resum", { clients: c.resultat.clients, tornat: percent(c.resultat.tornat) })
            : estat === "esborrany"
              ? c.proposada
              : t(`estat.${estat}`)}
        </p>
      </button>
    </li>
  );
}

function Accions({
  estat,
  quan,
  senseCanal,
  desat,
  onResol,
  onDesfes,
}: {
  estat: string;
  desat: boolean;
  quan: string;
  senseCanal: boolean;
  onResol: (r: Resolucio) => void;
  onDesfes: () => void;
}) {
  const t = useTranslations("panel.campanyes");
  if (estat === "aprovada" || estat === "descartada" || estat === "ara-no") {
    return (
      <p className="mr-auto flex flex-wrap items-center gap-3 text-sm" role="status">
        <span className="font-semibold">{estat === "aprovada" ? t("programada", { quan }) : t(`estat.${estat}`)}</span>
        <button type="button" className="min-h-11 underline" onClick={onDesfes}>
          {t("desfes")}
        </button>
      </p>
    );
  }
  return (
    <>
      {desat && (
        <span className="mr-auto text-sm text-suau" role="status">
          {t("desat")}
        </span>
      )}
      <Button variant="outline" onClick={() => onResol("descartada")}>
        {t("descarta")}
      </Button>
      <Button variant="outline" onClick={() => onResol("esborrany")}>
        {t("desa")}
      </Button>
      <Button onClick={() => onResol("aprovada")} disabled={senseCanal} title={senseCanal ? t("triaCanal") : undefined}>
        {t("aprova")}
      </Button>
    </>
  );
}

function Resultat({ c }: { c: Campanya }) {
  const t = useTranslations("panel.campanyes");
  const r = c.resultat!;
  return (
    <Card className="self-start">
      <p className="eyebrow text-granat">{t(`tipus.${c.tipus}`)}</p>
      <h2 className="mt-2 text-[1.9rem]">{c.titol}</h2>
      <p className="mt-1 text-suau">{c.proposada}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Xifra label={t("destinataris")} valor={String(r.clients)} />
        <Xifra label={t("hanTornat")} valor={percent(r.tornat)} />
        <Xifra label={t("control")} valor={percent(r.control)} />
      </div>

      <div className="mt-6 space-y-3" aria-hidden>
        <BarraResultat label={t("ambAvis")} valor={r.tornat} fort />
        <BarraResultat label={t("senseAvis")} valor={r.control} />
      </div>
      <p className="mt-4 text-[0.85rem] text-suau">{t("atribucio")}</p>

      <div className="mt-6 border-t border-linia pt-5">
        <p className="eyebrow mb-2 text-tinta">{t("enviat")}</p>
        <p className="rounded-2xl bg-paper p-4 leading-relaxed">
          <Variables text={c.missatges.original.ca} />
        </p>
      </div>
    </Card>
  );
}

function Xifra({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <p className="eyebrow text-tinta">{label}</p>
      <p className="font-titol mt-1 text-[1.8rem] leading-none">{valor}</p>
    </div>
  );
}

function BarraResultat({ label, valor, fort }: { label: string; valor: number; fort?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-[0.85rem]">
      <span className="w-24 shrink-0 text-suau">{label}</span>
      <span className="h-3 flex-1 overflow-hidden rounded-full bg-crema">
        <span className={cx("block h-full rounded-full", fort ? "bg-granat" : "bg-rosa")} style={{ width: `${valor * 100}%` }} />
      </span>
      <span className="w-10 text-right">{percent(valor)}</span>
    </div>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3 text-[0.92rem]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-granat"
      />
      {label}
    </label>
  );
}

/** Mostra {nom} i {paraula} com a variables destacades. */
function Variables({ text }: { text: string }) {
  const t = useTranslations("panel.campanyes");
  const parts = text.split(/(\{nom\}|\{paraula\})/g);
  return (
    <>
      {parts.map((p, i) =>
        p === "{nom}" || p === "{paraula}" ? (
          <span key={i} className="mx-0.5 rounded-md bg-white px-1.5 py-0.5 text-[0.88em] font-medium text-granat">
            {t(p === "{nom}" ? "varNom" : "varParaula")}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const omple = (text: string, e: { nom: string; paraula: string }) =>
  text.replaceAll("{nom}", e.nom).replaceAll("{paraula}", e.paraula);

function Telefon({ data, hora, text, etiqueta, ara }: { data: string; hora: string; text: string; etiqueta: string; ara: string }) {
  return (
    <figure className="mx-auto w-full max-w-[250px]">
      <figcaption className="sr-only">{etiqueta}</figcaption>
      <div className="textura-granat rounded-[2.2rem] border-[6px] border-tinta px-4 pt-9 pb-10 text-center">
        <p className="text-[0.8rem] text-groc">{data}</p>
        <p className="font-titol text-[3.2rem] leading-none text-groc">{hora}</p>
        <div className="mt-10 rounded-2xl bg-paper/95 p-3 text-left">
          <div className="flex items-start gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-groc">
              <Isotip className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex justify-between text-[0.68rem] font-semibold tracking-wide uppercase">
                La Carmanyola <span className="font-normal normal-case text-suau">{ara}</span>
              </p>
              <p className="mt-0.5 line-clamp-6 text-[0.75rem] leading-snug">{text}</p>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
