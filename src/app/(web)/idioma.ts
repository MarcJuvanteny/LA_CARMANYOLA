"use server";

import { cookies } from "next/headers";
import { IDIOMES, type Locale } from "@/i18n/request";

export async function canviaIdioma(l: Locale) {
  if (!IDIOMES.includes(l)) return;
  (await cookies()).set("NEXT_LOCALE", l, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
