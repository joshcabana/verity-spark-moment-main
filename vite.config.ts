import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
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
          if (id.includes("tsparticles")) return "tsparticles-core"; // Add chunk for tsparticles
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  // To be fully PWA-ready, consider integrating a Vite PWA plugin (e.g., vite-plugin-pwa)
  // for manifest generation, advanced caching strategies, and icon management.
}));
