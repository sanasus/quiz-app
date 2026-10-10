# AGENTS.md — QuizApp

## Project
React 19 · TypeScript 6 · Vite 8 · TanStack Router · TanStack Query · Zustand · i18next · Tailwind CSS v4 · Zod · Vitest · Oxlint · Prettier

## Commands
```
npm run dev          # Vite dev server (HMR)
npm run build        # tsc -b && vite build
npm run typecheck    # tsc -b
npm run lint         # oxlint
npm run format       # prettier --write "src/**/*.{ts,tsx,css,json}"
npm run test         # vitest (jsdom, globals: true)
npm run preview      # vite preview
```
Run `typecheck` before committing — `noUnusedLocals` and `noUnusedParameters` are enforced.

## Env
- `VITE_QUIZAPI_KEY` — API key (required for live mode)
- `VITE_USE_MOCK_DATA=true` — switch to mock data (see `src/shared/api/mock-*.ts`)

## Architecture
- **Entry**: `src/main.tsx` → `<Providers>` → `<RouterProvider>`
- **Routes**: TanStack Router (codegen at `src/routeTree.gen.ts`). Do not edit manually — run `build` to regenerate.
- **State**: React Query (server state, retry: 2, stale: 5 min) + Zustand (client state)
- **API layer**: `src/shared/api/` — adapter converts raw QuizAPI responses to internal models; mock data mirrors the real API
- **i18n**: `src/app/i18n.ts` — en/ru, browser detection, localStorage persistence
- **Alias**: `@` → `src/` (both vite and tsconfig)

## Testing
- Config: `vitest.config.ts` — jsdom env, globals enabled, setup at `src/test/setup.ts`
- Tests: `src/**/*.{test,spec}.{js,mjs,ts,tsx}`
- Run single file: `npm run test src/shared/api/adapter.test.ts`
- Run single test: `npm run test -- -t "test name"`

## Formatting / Linting
- Prettier: no semicolons, single quotes, trailing comma all, 80 char, LF
- Oxlint: `react`, `typescript`, `oxc` plugins; `react/rules-of-hooks` error; `react/only-export-components` warn (allow constant exports)

## Constraints
- `verbatimModuleSyntax` and `erasableSyntaxOnly` enabled — avoid `import type { X } = require(...)` and non-erasable syntax.
- `skipLibCheck: true` — don't fix errors that only appear in `node_modules`.
- No React Compiler (not enabled).
- Tailwind CSS v4 — uses `@tailwindcss/vite` plugin, not `tailwind.config.js`.
