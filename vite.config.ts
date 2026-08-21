import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro({
      preset: "vercel",
      compatibilityDate: "2025-01-01",
      vercel: {
        functions: {
          runtime: "nodejs20.x",
        },
      },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});

