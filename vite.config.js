import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// NOTE: Mock data handling has been moved to Mock Service Worker (MSW)
// See src/mocks/handlers.js and src/mocks/browser.js
// To enable MSW in development, import and start the worker in src/main.js

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      // All API requests go directly to backend monolith
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
