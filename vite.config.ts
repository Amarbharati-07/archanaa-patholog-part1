import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if running in production/Render
const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@db": path.resolve(__dirname, "./db"),
      "@assets": path.resolve(__dirname, "./client/src/assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  publicDir: path.resolve(__dirname, "client/public"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: !isProduction,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: undefined,
      },
    },
    assetsInlineLimit: 0, // Don't inline assets, copy them
  },
  server: {
    port: 5173,
    strictPort: true,
    host: "0.0.0.0",
  },
  assetsInclude: ['**/*.mp4', '**/*.webm', '**/*.ogg'],
});
