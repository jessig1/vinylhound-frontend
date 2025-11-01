import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // your Go API
        changeOrigin: true,
        // keep the /api prefix so frontend can call fetch('/api/...')
        rewrite: (p) => p, 
      },
    },
  },
});
