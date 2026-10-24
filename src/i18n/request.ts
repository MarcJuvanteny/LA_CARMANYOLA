import { getRequestConfig } from "next-intl/server";

// El panel de l'amo és en català. Quan arribi la web pública,
// el locale sortirà de la ruta (ca per defecte, es, en).
export default getRequestConfig(async () => {
  const locale = "ca";
  return {
    locale,
    timeZone: "Europe/Madrid",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
