import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const platformBoundaryPresent = existsSync(path.join(repositoryRoot, "packages/contracts/src/platform-boundary.ts"));

export default defineConfig(() => ({
  plugins: [react()],
  define: {
    __STARWARD_PLATFORM_BOUNDARY_PRESENT__: JSON.stringify(platformBoundaryPresent),
  },
  server: {
    proxy: process.env.STARWARD_API_BASE_URL
      ? { "/v1": { target: process.env.STARWARD_API_BASE_URL, changeOrigin: false } }
      : undefined,
  },
}));
