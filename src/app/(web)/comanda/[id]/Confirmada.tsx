"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { recordaMobilCarnet, useCistella } from "@/components/web/Cistella";

/** Comanda pagada: la cistella es buida i, si el mòbil és d'un carnet, el dispositiu el recorda. */
export function BuidaCistella({ mobil }: { mobil: string | null }) {
  const { llesta, buida } = useCistella();
  useEffect(() => {
    if (!llesta) return;
    buida();
    if (mobil) recordaMobilCarnet(mobil);
  }, [llesta, buida, mobil]);
  return null;
}

/** El webhook de Stripe pot trigar uns segons: es torna a mirar cada 2 s durant un minut. */
export function EsperaPagament() {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      if (++n > 30) clearInterval(id);
      router.refresh();
    }, 2000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
