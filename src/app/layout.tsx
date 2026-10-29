import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Redgato: títols, sempre en pes Regular (400).
const redgato = localFont({ src: "./fonts/Redgato-Regular.woff2", weight: "400", style: "normal", variable: "--font-redgato", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });

export const metadata: Metadata = {
  title: { default: "La Carmanyola", template: "%s · La Carmanyola" },
  description: "Cuina tradicional catalana per emportar al Poblenou.",
};

export const viewport: Viewport = {
  themeColor: "#77160E",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${redgato.variable} ${archivo.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
