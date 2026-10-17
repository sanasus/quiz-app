import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

/**
 * Vitest transforms TS through esbuild, which cannot emit
 * `design:paramtypes` metadata — and that metadata is exactly what
 * Nest's constructor injection runs on. SWC can, so tests run through
 * it (`.swcrc` enables legacy decorators + decorator metadata) while
 * vitest keeps handling the rest.
 */
export default defineConfig({
  esbuild: false,
  plugins: [
    swc.vite({
      // Vitest loads the config as CJS; point SWC at the server tsconfig
      // explicitly so decorators + design:paramtypes are emitted.
      tsconfigFile: './tsconfig.json',
    }),
  ],
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
})
