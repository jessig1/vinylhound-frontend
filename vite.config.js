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
      "/api/v1/auth": {
        target: "http://localhost:8001",
        changeOrigin: true,
        secure: false,
      },
      "/api/v1/users": {
        target: "http://localhost:8001",
        changeOrigin: true,
        secure: false,
      },
      "/api/v1/albums": {
        target: "http://localhost:8002",
        changeOrigin: true,
        secure: false,
      },
      "/api/v1/artists": {
        target: "http://localhost:8002",
        changeOrigin: true,
        secure: false,
      },
      "/api/v1/songs": {
        target: "http://localhost:8002",
        changeOrigin: true,
        secure: false,
      },
      "/api/v1/ratings": {
        target: "http://localhost:8003",
        changeOrigin: true,
        secure: false,
      },
      "/api/v1/playlists": {
        target: "http://localhost:8004",
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
