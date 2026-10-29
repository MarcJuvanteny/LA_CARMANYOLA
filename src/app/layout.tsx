import type { Metadata, Viewport } from "next";
import { Archivo, Rubik } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

const rubik = Rubik({ subsets: ["latin"], weight: "400", variable: "--font-rubik" });
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
    <html lang={locale} className={`${rubik.variable} ${archivo.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
