import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': a new version waits for the player's OK (toast) instead
      // of swapping the app silently in the middle of a quiz.
      registerType: 'prompt',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'apple-touch-icon-180x180.png',
      ],
      manifest: {
        name: 'QuizApp',
        short_name: 'QuizApp',
        description:
          'Quiz game with four modes, XP, statistics and achievements',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Same as the light <meta name="theme-color"> in index.html.
        theme_color: '#e6e2f6',
        background_color: '#e6e2f6',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell only; question data is never cached.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Only crawlers fetch the Open Graph picture.
        globIgnores: ['og-image.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Fresh questions and provider errors must reach the app as today.
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
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
})
