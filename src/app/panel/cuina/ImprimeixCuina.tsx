"use client";

import { Button } from "@/components/panel/ui";

/** Cuina sol tenir el full penjat a la paret: imprimeix només la producció (el menú del panell no surt). */
export function ImprimeixCuina({ etiqueta }: { etiqueta: string }) {
  return (
    <Button variant="ghost" className="print:hidden" onClick={() => window.print()}>
      {etiqueta}
    </Button>
  );
}
