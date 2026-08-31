import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@theme": resolve(__dirname, "theme"),
      "@db": resolve(__dirname, "drizzle"),
      "@": resolve(__dirname, "src"),
    },
  },
  // Next/React 19 — JSX automatic runtime. Vitest идёт через esbuild и
  // tsconfig.jsx не читает, поэтому задаём явно и не зависим от того, что
  // впишет в tsconfig `next typegen`.
  esbuild: { jsx: "automatic" },
});
