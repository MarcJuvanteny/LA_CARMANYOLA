"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { llegeixComanda, type Comanda } from "@/components/web/Cistella";
import { ResumConfirmada } from "@/components/web/ResumConfirmada";

export function Confirmada({ id }: { id: string }) {
  const t = useTranslations("web.comanda");
  const [comanda, setComanda] = useState<Comanda | null | undefined>(undefined);

  useEffect(() => {
    // La comanda es desa al navegador on s'ha fet.
    setComanda(llegeixComanda(id));
  }, [id]);

  if (comanda === undefined) return <main className="min-h-[60vh]" />;

  if (!comanda) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-[480px] flex-col items-center justify-center gap-5 px-5 py-16 text-center">
        <p className="m-0 text-[15px]">{t("noTrobada")}</p>
        <Link href="/" className="web-btn bg-granat text-groc">
          {t("tornaInici")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-7 pb-16">
      <ResumConfirmada comanda={comanda} />
    </main>
  );
}
