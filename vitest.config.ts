import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,ts,tsx}'],
    // Hermetic env: unit tests always run the live-provider code path
    // (mock mode is e2e-only — playwright sets its own env), and the
    // quizapi dispatch tests need *a* key so getApiKey() doesn't throw
    // before the stubbed fetch. Pins override CI env and dev .env.
    env: {
      VITE_USE_MOCK_DATA: 'false',
      VITE_QUIZAPI_KEY: 'unit-test-key',
    },
  },
});
