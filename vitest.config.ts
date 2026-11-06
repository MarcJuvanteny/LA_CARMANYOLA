import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" peta fora de Next: als tests és un mòdul buit.
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
