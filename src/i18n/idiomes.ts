// Es pot importar des del client (el selector d'idioma del panell); request.ts és només de servidor.
export const IDIOMES = ["ca", "es", "en"] as const;
export type Locale = (typeof IDIOMES)[number];
