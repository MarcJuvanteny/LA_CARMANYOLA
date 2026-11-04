import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // El model del .pkpass es llegeix del disc en temps d'execució.
  outputFileTracingIncludes: { "/carnet/[id]/wallet": ["./src/lib/wallet/model.pass/**"] },
};

export default withNextIntl(nextConfig);
