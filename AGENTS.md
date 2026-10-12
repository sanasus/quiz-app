# AGENTS.md — QuizApp

## Project
React 19 · TypeScript 6 · Vite 8 · TanStack Router · TanStack Query · Zustand · i18next · Tailwind CSS v4 · Zod · Vitest · Oxlint · Prettier

## Commands
```
npm run dev          # Vite dev server (HMR)
npm run build        # tsc -b && vite build (regenerates routeTree.gen.ts)
npm run typecheck    # tsc -b
npm run lint         # oxlint
npm run format       # prettier --write "src/**/*.{ts,tsx,css,json}"
npm run test         # vitest (jsdom, globals: true)
npm run e2e          # playwright test (runs against dev server with mock data)
npm run preview      # vite preview
```
Run `typecheck` before committing — `noUnusedLocals` and `noUnusedParameters` are enforced.

## Env
- `VITE_QUIZAPI_KEY` — API key (required for live mode; see `.env`)
- `VITE_USE_MOCK_DATA=true` — switch to mock data (see `src/shared/api/mock-*.ts`)

## Architecture
- **Entry**: `src/main.tsx` → `<Providers>` → `<RouterProvider>`
- **Providers**: `src/app/providers.tsx` — wraps `QueryClientProvider` → `I18nextProvider` → `RouterProvider` (ReactQueryDevtools unconditionally mounted)
- **Routes**: TanStack Router with `autoCodeSplitting: true`. Codegen at `src/routeTree.gen.ts` — do not edit; run `build` to regenerate.
- **State**: React Query (`retry: 2`, `staleTime: 5 min`, `gcTime: 10 min`) + Zustand (client state)
- **API layer**: `src/shared/api/` — `adapter.ts` converts raw QuizAPI responses to internal models; mock mirrors the real API
- **i18n**: `src/app/i18n.ts` — en/ru, `fallbackLng: 'en'`, detection order: querystring → localStorage → navigator
- **Alias**: `@` → `src/` (both vite and tsconfig)
- **tsconfig**: `tsconfig.json` is a root file with project references; compiler options live in `tsconfig.app.json`
- **Structure**: `src/features/` (domain code), `src/shared/` (api, lib, types, ui), `src/routes/`, `src/locales/`

## Testing
- Config: `vitest.config.ts` — jsdom env, globals enabled, setup at `src/test/setup.ts`
- Tests: `src/**/*.{test,spec}.{js,mjs,ts,tsx}`
- Run single file: `npm run test src/shared/api/adapter.test.ts`
- Run single test: `npm run test -- -t "test name"`
- E2E: `npm run e2e` — Playwright against `localhost:5173` (dev server auto-started with mock data)
- E2E tests carry tags: `@smoke`, `@slow`, `@mobile`, `@i18n` — `npm run e2e:smoke` runs the
  PR subset, `npm run e2e:ui` opens the interactive UI, `npm run e2e:report` shows the HTML
  report; filter manually with `npm run e2e -- --grep '@smoke'` (quote `@` in PowerShell)
- E2E CI: `.github/workflows/e2e.yml` — smoke suite on push/PR, full suite nightly (03:00 UTC);
  HTML report + traces uploaded as artifacts on failure

## E2E rules
- Before writing or modifying anything under `e2e/` or `playwright.config.ts`,
  load the `playwright-best-practices` skill (skill tool) and follow it —
  locators, assertions, waiting, structure, tags. Do not improvise Playwright
  patterns. Shared helpers live in `e2e/fixtures.ts` (`startQuiz`,
  `completeQuiz`, `optionLocator`, `waitForResults`) — reuse them instead of
  writing new flows inline.
- Prefer user-facing locators (roles, labels); use `data-testid`/`data-state`
  only when no accessible hook exists. Never assert on CSS classes or timings.

## Formatting / Linting
- Prettier: no semicolons, single quotes, trailing comma all, 80 char, LF, `arrowParens: always`
- Oxlint: `react`, `typescript`, `oxc` plugins; `react/rules-of-hooks` error; `react/only-export-components` warn (allowConstantExport)

## Constraints
- `verbatimModuleSyntax` and `erasableSyntaxOnly` enabled — avoid `import type { X } = require(...)` and non-erasable syntax.
- `skipLibCheck: true` — don't fix errors that only appear in `node_modules`.
- No React Compiler (not enabled).
- Tailwind CSS v4 — uses `@tailwindcss/vite` plugin, not `tailwind.config.js`.
