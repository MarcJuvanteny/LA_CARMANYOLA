import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Al Codespace el proxy de GitHub envia `x-forwarded-host: <nom>-3000.app.github.dev` però reescriu
// `origin` a localhost:3000. Sense això, Next rebutja les Server Actions (p. ex. el formulari d'/entra).
const { CODESPACE_NAME, GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN } = process.env;
const codespace = CODESPACE_NAME && GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ? `${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}` : null;

const nextConfig: NextConfig = {
  // El model del .pkpass es llegeix del disc en temps d'execució.
  outputFileTracingIncludes: { "/carnet/[id]/wallet": ["./src/lib/wallet/model.pass/**"] },
  ...(codespace && {
    allowedDevOrigins: [codespace],
    experimental: { serverActions: { allowedOrigins: [codespace, "localhost:3000"] } },
  }),
};

export default withNextIntl(nextConfig);
