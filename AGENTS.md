# AGENTS.md — QuizApp

## Project
React 19 · TypeScript 6 · Vite 8 · TanStack Router · TanStack Query · Zustand · i18next · Tailwind CSS v4 · Zod · Vitest · Oxlint · Prettier

## Commands
```
npm run dev          # Vite dev server (HMR)
npm run dev:server   # NestJS proxy on :3000 (server/)
npm run dev:all      # vite + proxy together
npm run build        # tsc -b && vite build (regenerates routeTree.gen.ts)
npm run build:server # tsc -p server/tsconfig.build.json
npm run typecheck    # tsc -b (app + e2e projects)
npm run typecheck:server
npm run lint         # oxlint
npm run format       # prettier --write "src/**/*.{ts,tsx,css,json}"
npm run test         # vitest (jsdom, globals: true)
npm run test:server  # vitest for server/ (node env, own project)
npm run e2e          # playwright test (runs against dev server with mock data)
npm run preview      # vite preview
```
Run `typecheck` before committing — `noUnusedLocals` and `noUnusedParameters` are enforced.

## Env
- Client: `VITE_USE_MOCK_DATA=true` — switch to mock data and force `providerId='mock'` on every page load (see `src/shared/api/mock-*.ts`); the settings switcher lists mock only while it is the active source — no manual way back. There is no other client env: **no API key reaches the browser**.
- Server (`server/`): `QUIZAPI_KEY` (required only for the `quizapi` provider; missing key → typed `auth` error, the server still boots), `QUIZAPI_BASE_URL`, `TRIVIA_BASE_URL`, `UPSTREAM_TIMEOUT_MS` (default 10 000), `CORS_ORIGIN`, `PORT` (default 3000), `THROTTLE_TTL_MS`/`THROTTLE_LIMIT` (60 000 / 30 per IP, `/health` exempt), `TRUST_PROXY` (hops; required behind a balancer).

## Architecture
- **Entry**: `src/main.tsx` → `<Providers>` → `<RouterProvider>`
- **Providers**: `src/app/providers.tsx` — wraps `QueryClientProvider` → `I18nextProvider` → `RouterProvider` (ReactQueryDevtools unconditionally mounted)
- **Routes**: TanStack Router with `autoCodeSplitting: true`. Codegen at `src/routeTree.gen.ts` — do not edit; run `build` to regenerate.
- **State**: React Query (`retry: 2`, `staleTime: 5 min`, `gcTime: 10 min`) + Zustand (client state)
- **API layer**: `src/shared/api/` — provider registry (`providers.ts`: quizapi/trivia/mock), active provider in the `provider-store` persist store (part of every query key). The two live providers dispatch through `backend-client.ts` to our own NestJS proxy (`/api/quiz/questions`, `/api/quiz/catalog`); upstream schemas, adaptation and error classification live server-side (`server/src/quiz/`). `backend.schemas.ts` is the client half of that wire contract. Mock is the only provider that computes data in the browser. No transparent fallback — switching is explicit: settings selector, `ApiErrorDialog` on /quiz, auto-switch + toast on /setup (see `docs/providers.md`, `docs/proxy-server.md`)
- **Proxy server**: `server/` (npm workspace `@quiz-app/server`) — NestJS, global prefix `api` (health excluded). `UpstreamError.kind` is the switch-policy signal and is returned in a typed envelope `{ error: { kind, providerId, status, retryAfter, message } }` by `http-error.filter.ts`; the client trusts that envelope over the HTTP status, which the proxy rewrites. An answer *without* the envelope is reported as `network` — a failure of our own server, never a reason to switch providers.
- **i18n**: `src/app/i18n.ts` — en/ru, `fallbackLng: 'en'`, detection order: querystring → localStorage → navigator
- **Alias**: `@` → `src/` (both vite and tsconfig)
- **tsconfig**: `tsconfig.json` is a root file with project references; compiler options live in `tsconfig.app.json`
- **Structure**: `src/features/` (domain code), `src/shared/` (api, lib, types, ui), `src/routes/`, `src/locales/`

## Documentation
- `docs/README.md` — docs index (what to read for what)
- `docs/providers.md` — question-source (provider) registry, error-kind policy, explicit provider switching, mock-data rule
- `docs/proxy-server.md` — NestJS proxy contract (`/api/quiz/*`), error envelope, server env, Vercel deploy
- `docs/quizapi-upstream.md` — external QuizAPI v1 reference (only the endpoints we use: questions browse, metadata, categories)
- `docs/trivia-upstream.md` — external The Trivia API v2 reference, category mapping, CC BY-NC attribution
- `PLAN.md` — remaining work (§1) and accepted deviations from the original plan (§2)

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
- If the `playwright-best-practices` skill is available in your environment,
  load it before writing or modifying anything under `e2e/` or
  `playwright.config.ts` and follow it — locators, assertions, waiting,
  structure, tags. Do not improvise Playwright patterns. Without the skill,
  stick to the rules below.
- Shared helpers live in `e2e/fixtures.ts` (`startQuiz`,
  `completeQuiz`, `optionLocator`, `waitForResults`) — reuse them instead of
  writing new flows inline.
- Provider-switch tests intercept our own `/api/quiz/*` (the proxy the app
  actually calls) with `e2e/api-fixtures.ts` (`routeQuizApi`, `routeTrivia`,
  `abortTrivia`); never let a request reach the vite `/api` proxy — remember
  that `page.goto`/reload re-forces `providerId` to mock, so drive provider
  changes through SPA navigation only. Fixture bodies follow the proxy wire
  contract, so change `backend.schemas.ts` and `api-fixtures.ts` together.
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
