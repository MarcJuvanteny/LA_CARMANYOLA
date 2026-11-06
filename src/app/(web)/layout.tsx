import type { Metadata } from "next";
import { CalaixComanda } from "@/components/web/CalaixComanda";
import { Capcalera } from "@/components/web/Capcalera";
import { CistellaProvider } from "@/components/web/Cistella";
import { Peu } from "@/components/web/Peu";
import { stripeConfigurat } from "@/lib/pagaments/stripe";
import "./web.css";

export const metadata: Metadata = {
  title: { default: "La Carmanyola · Cuina catalana per emportar", template: "%s · La Carmanyola" },
  description: "Si traiem el bowl, què queda? Cuina catalana de tota la vida, en carmanyola, per emportar al Poblenou.",
};

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <CistellaProvider>
      <div className="web">
        <Capcalera />
        {children}
        <Peu />
        <CalaixComanda pagamentEnLinia={stripeConfigurat()} />
      </div>
    </CistellaProvider>
  );
}
