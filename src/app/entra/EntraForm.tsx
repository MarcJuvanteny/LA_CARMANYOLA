"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/panel/ui";
import { entra } from "./actions";

const camp = "mt-1.5 h-11 w-full rounded-xl border border-linia bg-white px-3.5 outline-none focus:border-granat";

export function EntraForm({ torna }: { torna: string }) {
  const t = useTranslations("entra");
  const [estat, accio, pendent] = useActionState(entra, { error: false });
  return (
    <form action={accio} className="mt-6 space-y-4">
      <input type="hidden" name="torna" value={torna} />
      <label className="block text-sm font-semibold">
        {t("correu")}
        <input name="email" type="email" autoComplete="username" required className={camp} />
      </label>
      <label className="block text-sm font-semibold">
        {t("contrasenya")}
        <input name="password" type="password" autoComplete="current-password" required className={camp} />
      </label>
      {estat.error && (
        <p role="alert" className="text-sm font-semibold text-granat">
          {t("error")}
        </p>
      )}
      <Button type="submit" disabled={pendent} className="w-full">
        {pendent ? t("entrant") : t("entra")}
      </Button>
    </form>
  );
}
