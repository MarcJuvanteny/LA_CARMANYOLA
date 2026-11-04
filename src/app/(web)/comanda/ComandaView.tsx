"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { preuLinia, useCistella } from "@/components/web/Cistella";
import { euros } from "@/lib/format";

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

export function ComandaView() {
  const t = useTranslations("web.comanda");
  const router = useRouter();
  const { llesta, linies, total, canvia, confirma } = useCistella();
  const [hores, setHores] = useState<string[]>([]);
  const [hora, setHora] = useState("");
  const [nom, setNom] = useState("");
  const [enviada, setEnviada] = useState(false);

  useEffect(() => {
    // L'hora depèn del rellotge del client: es calcula després d'hidratar.
    const h = franges();
    setHores(h);
    setHora(h[0]);
  }, []);

  if (!llesta || enviada) return <main className="min-h-[60vh]" />;

  if (!linies.length) {
    return (
      <main className="mx-auto flex min-h-[50vh] w-full max-w-[640px] flex-col items-center justify-center gap-5 px-5 py-16 text-center">
        <h1 className="m-0 text-[clamp(30px,4vw,48px)]">{t("titol")}</h1>
        <p className="m-0 text-[15px]">{t("buida")}</p>
        <Link href="/carta" className="web-btn bg-granat text-groc">
          {t("anaCarta")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 pt-6 pb-16">
      <h1 className="m-0 px-1 text-[clamp(30px,4vw,48px)] tracking-[-.02em]">{t("titol")}</h1>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setEnviada(true);
          const c = confirma({ hora, nom: nom.trim() });
          router.push(`/comanda/${c.id}`);
        }}
      >
        <section className="flex flex-col gap-1 rounded-[22px] bg-white p-5">
          {linies.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 border-b border-linia py-3 last:border-0">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] font-medium">{l.nom}</span>
                {l.dinar && <span className="text-xs text-suau">{t("dinar", { nom: l.dinar.nom.toLowerCase() })}</span>}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-full border border-linia">
                  <button type="button" aria-label={t("treu", { plat: l.nom })} onClick={() => canvia(l.id, l.quantitat - 1)} className="size-9 cursor-pointer border-0 bg-transparent text-lg text-tinta">
                    −
                  </button>
                  <span className="min-w-4 text-center text-sm font-medium">{l.quantitat}</span>
                  <button type="button" aria-label={t("posa", { plat: l.nom })} onClick={() => canvia(l.id, l.quantitat + 1)} className="size-9 cursor-pointer border-0 bg-transparent text-lg text-tinta">
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
            <label htmlFor="nom" className="text-[13px] font-medium">
              {t("nom")}
            </label>
            <input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required autoComplete="given-name" placeholder={t("nomPlaceholder")} className="h-[50px] rounded-xl border border-linia bg-white px-4 text-base" />
          </div>
        </section>

        <button type="submit" disabled={!hora} className="cursor-pointer rounded-full border-0 bg-granat p-[17px] text-[13px] font-medium tracking-[.06em] text-paper uppercase disabled:opacity-60">
          {t("confirma", { total: euros(total) })}
        </button>
        <p className="m-0 px-1 text-xs leading-[1.6] text-suau">{t("nota")}</p>
      </form>
    </main>
  );
}
