import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Keep heavy real-time/video dependencies in dedicated chunks to reduce
    // core route bundle pressure and isolate cache churn.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("agora-rtc-sdk-ng")) return "agora-core";
          if (id.includes("framer-motion")) return "motion-core";
          if (id.includes("recharts")) return "charts-core";
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
}));
