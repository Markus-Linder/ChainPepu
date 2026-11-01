import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // Pure game logic shared with Supabase Edge Functions (Deno) – no runtime deps.
      "@shared": path.resolve(import.meta.dirname, "./supabase/functions/_shared"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (/node_modules\/(three|@react-three)\//.test(id)) return "three";
          if (/node_modules\/(react|react-dom|react-router|@tanstack|@supabase)\//.test(id)) return "vendor";
          if (/node_modules\/recharts\//.test(id)) return "charts";
          return undefined;
        },
      },
    },
  },
}));
