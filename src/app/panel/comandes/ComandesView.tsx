"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, CardTitle, PageHeader, Pill } from "@/components/panel/ui";
import { euros } from "@/lib/format";
import { faixaLocal } from "./actions";

export interface ComandaPanell {
  id: string;
  canal: "web" | "local" | "plataforma";
  estat: "pendent" | "confirmada" | "cancel·lada";
  numero: string | null;
  nom: string;
  hora: string;
  total: number;
  linies: string[];
  sumada: boolean;
  qr: string | null;
  enllac: string | null;
}

export function ComandesView({ comandes }: { comandes: ComandaPanell[] }) {
  const t = useTranslations("panel.comandes");
  const [nom, setNom] = useState("");
  const [creant, crea] = useTransition();
  const [imprimeix, setImprimeix] = useState<string | null>(null);

  const imprimir = (id: string) => {
    setImprimeix(id);
    // Que React pinti només la faixa triada abans d'obrir el diàleg d'impressió.
    requestAnimationFrame(() => {
      window.print();
      setImprimeix(null);
    });
  };

  return (
    <>
      <div className="print:hidden">
        <PageHeader title={t("titol")} subtitle={t("subtitol")} />
        <Card className="mb-6">
          <CardTitle>{t("local")}</CardTitle>
          <form
            className="mt-3 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              crea(async () => {
                const id = await faixaLocal(nom);
                setNom("");
                setTimeout(() => imprimir(id), 300);
              });
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              {t("nom")}
              <input value={nom} onChange={(e) => setNom(e.target.value)} className="h-11 rounded-xl border border-linia bg-white px-4" />
            </label>
            <Button type="submit" disabled={creant}>
              {t("creaFaixa")}
            </Button>
          </form>
          <p className="mt-2 text-sm text-suau">{t("localNota")}</p>
        </Card>

        {!comandes.length && <p className="text-suau">{t("buit")}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {comandes.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>
                    {c.numero ? t("numero", { n: c.numero }) : t("senseNumero")} · {c.hora}
                  </CardTitle>
                  <p className="text-sm text-suau">
                    {c.nom || "—"} · {t(`canal.${c.canal}`)} {c.total > 0 && `· ${euros(c.total)}`}
                  </p>
                </div>
                <Pill dashed={c.estat !== "confirmada"}>{t(`estat.${c.estat === "cancel·lada" ? "cancellada" : c.estat}`)}</Pill>
              </div>
              {c.linies.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {c.linies.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              )}
              {c.qr && (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm">{c.sumada ? t("sumada") : t("perSumar")}</span>
                  <Button variant="outline" onClick={() => imprimir(c.id)}>
                    {t("imprimeix")}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* La faixa "Desbowlitza aquí": només surt en imprimir. */}
      {comandes
        .filter((c) => c.qr && c.id === imprimeix)
        .map((c) => (
          <div key={c.id} className="hidden print:flex print:flex-col print:items-center print:gap-3 print:p-6 print:text-center">
            <p className="font-titol text-3xl text-granat">{t("faixa")}</p>
            <div className="size-[45mm] [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: c.qr! }} />
            <p className="text-sm">{c.numero ? t("numero", { n: c.numero }) : c.nom}</p>
            <p className="text-xs text-suau">{c.enllac}</p>
          </div>
        ))}
    </>
  );
}
