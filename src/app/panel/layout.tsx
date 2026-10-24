import type { Metadata } from "next";
import { EnDirecte } from "@/components/panel/EnDirecte";
import { PanelStateProvider } from "@/components/panel/PanelState";
import { Sidebar } from "@/components/panel/Sidebar";
import { resolucions } from "@/lib/db/panel";

export const metadata: Metadata = {
  title: { default: "Panell", template: "%s · Panell · La Carmanyola" },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const inicial = await resolucions();
  return (
    <PanelStateProvider inicial={inicial}>
      <EnDirecte />
      <div className="min-h-dvh bg-paper lg:flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pt-6 pb-16 sm:px-8 lg:px-11 lg:pt-9">
          <div className="mx-auto max-w-[1120px]">{children}</div>
        </main>
      </div>
    </PanelStateProvider>
  );
}
