import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Termux / Samsung Galaxy S20 FE 5G local run config.
// This avoids Replit-only Vite plugins and uses process.cwd() so Android/Termux
// paths resolve reliably when running from artifacts/agent-studio.
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "@assets": path.resolve(process.cwd(), "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: process.cwd(),
  build: {
    outDir: path.resolve(process.cwd(), "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    host: "0.0.0.0",
  },
  preview: {
    port: 5173,
    host: "0.0.0.0",
  },
});
