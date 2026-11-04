"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR cap a /carnet: des de l'ordinador, s'escaneja i el carnet es fa (i es desa) al mòbil. */
export function QrCarnet({ className = "" }: { className?: string }) {
  const [svg, setSvg] = useState("");

  // L'origen només se sap al navegador.
  useEffect(() => {
    QRCode.toString(`${window.location.origin}/carnet`, {
      type: "svg",
      margin: 0,
      color: { dark: "#77160e", light: "#ffffff00" },
    }).then(setSvg);
  }, []);

  return <div aria-hidden className={`[&_svg]:size-full ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
