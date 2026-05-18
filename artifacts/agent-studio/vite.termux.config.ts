import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Termux / Samsung Galaxy S20 FE 5G local run config.
// This avoids Replit-only Vite plugins and skips @tailwindcss/vite because
// its lightningcss native package is not reliable in Android Termux.
export default defineConfig({
  base: "/",
  plugins: [react()],
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
