import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [tanstackRouter({
    target: 'react',
    autoCodeSplitting: true,
  }), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Live providers go through the NestJS proxy (server/): same-origin
    // in dev, no CORS config on the frontend.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
