import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // Virtual module of vite-plugin-pwa: only exists in a vite build.
      'virtual:pwa-register/react': path.resolve(
        import.meta.dirname,
        './src/test/pwa-register-stub.ts',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,ts,tsx}'],
    // The server workspace runs its own vitest (node env + SWC); keep
    // it out of this jsdom project.
    exclude: [...configDefaults.exclude, 'server/**', 'e2e/**', 'dist/**'],
    // Hermetic env: unit tests always run the live-provider code path
    // (mock mode is e2e-only — playwright sets its own env). Pins
    // override CI env and dev .env.
    env: {
      VITE_USE_MOCK_DATA: 'false',
    },
  },
});
