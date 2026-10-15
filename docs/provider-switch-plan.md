# План: выбор API-провайдера вместо автоматического фолбека

Статус: план, реализация не начата
Дата: 15.10.2026
Затронутый коммит (текущее состояние фолбека): `2a3476b77ca0e2a00395840d1e9598920fc8ae39`
("feat(api): fall back to The Trivia API when quizapi.io fails")

## Цель

1. Убрать автоматический фолбек (`withFallback` / circuit-breaker).
2. Хранить в Zustand-сторе ключ используемого API-провайдера, переключать его при
   ошибке в текущем API.
3. При ошибке во время активной сессии — диалог с двумя вариантами: «Retry» и
   «Change API».
4. «Retry» — повторить тот же запрос; «Change API» — сменить провайдера и перейти
   в setup.
5. После смены провайдера всегда сбрасывать сессию и уходить в setup; данные на
   setup грузятся уже новым API.
6. В настройках — ручной переключатель провайдера.

## Зафиксированные решения (согласовано 15.10.2026)

| №  | Вопрос | Решение |
|----|--------|---------|
| 1  | Ошибка вне сессии (setup: metadata/categories) | Авто-смена провайдера + тост. Диалог не показываем. |
| 2  | Кнопка «End run» (`finishWithoutBatch`) | Убрать из UI полностью (в сторе оставить). |
| 3  | Пауза таймеров на время диалога | Не нужна: батчи существуют только в режиме выживания, в остальных режимах все вопросы грузятся разом. |
| 4  | Какие ошибки ведут к смене провайдера | Все, кроме network: network — вина пользователя/его интернета, только retry того же провайдера. Остальные (auth, rate limit, parse, http 5xx) — провайдер «сломан», кандидат на смену. |
| 5  | Атрибуция CC BY-NC 4.0 при возврате на quizapi | Динамический футер по providerId + legal-review (см. T9). |
| 6  | Оба провайдера упали (переключение туда-сюда) | Остаётся нерешённым, разбирается на последнем этапе (см. «Открытые вопросы»). |

Реализация в session-контексте: диалог показывается на `/quiz` (начальная загрузка
вопросов и survival-батчи) — сессия уже стартовала, пользователь ждёт преемственность.
На `/setup` сессии нет → политика «вне сессии» (решение №1).

## Политика обработки ошибок

Классификация ошибок — typed `QuizApiError { kind }` (см. T1):

| Контекст | `network` | `auth` / `rate_limit` / `parse` / `http` (5xx и прочие), `timeout` |
|---|---|---|
| Сессия (`/quiz`: начальная загрузка, survival-батч) | Авто-retry того же провайдера (network, count < 2). После исчерпания ретраев — диалог: «Retry» основная кнопка, «Change API» вторичная. | Сразу диалог «Retry / Change API» (без авто-retry). |
| Вне сессии (`/setup`: metadata/categories) | Провайдер НЕ меняем: inline-ошибка + кнопка Retry. | Авто-смена провайдера + тост «Источник недоступен — переключили на X». Если новый провайдер тоже упал — inline-ошибка + Retry, повторной авто-смены нет (защита от цикла). |

## Архитектура (кратко)

- `src/shared/api/providers.ts` — `ProviderId = 'quizapi' | 'trivia' | 'mock'`,
  интерфейс `QuizProvider`, реестр `PROVIDERS`, `getProvider`,
  `getSwitcherProviders(current)` (mock — лишь пока активен), `alternateProviderId`
  (quizapi ↔ trivia, mock → quizapi).
  Mock — полноценный провайдер; env `VITE_USE_MOCK_DATA` остаётся источником дефолта
  (дев/e2e), в `merge` стора при `USE_MOCK` форсится `mock`.
- `src/shared/api/quizapi-client.ts` — перенос QuizAPI-клиента из `quizapi.ts`
  (buildQuestionsUrl, fetchQuizApiQuestions/Metadata/Categories, SURVIVAL_BATCH_SIZE и
  т.д.), чтобы `providers.ts` не тянул React. `quizapi.ts` остаётся под хуками.
- `src/shared/api/errors.ts` — `QuizApiError`, `ErrorKind`, `classifyError`.
- `src/shared/api/provider-store.ts` — отдельный persist-стор (ключ `quiz-provider`,
  version 1, zod-merge по образцу `settings-store.ts`); не session-store (тот
  сбрасывается), не settings-store (API-слой не импортирует `app/`).
- Query-ключи расширяются providerId: `['quiz', providerId, 'questions', config]`,
  `['quiz', providerId, 'questions', 'batch', config, offset]`,
  `['quiz', providerId, 'metadata']`, `['quiz', providerId, 'categories']` —
  смена провайдера автоматически инвалидирует кеш и перезагружает данные в setup.
- `src/app/query-client.ts` — `queryClient` экспортируется (сейчас локальная
  константа в `src/app/providers.tsx`) для `removeQueries({ queryKey: ['quiz'] })`
  из не-React кода.
- `src/features/provider/use-change-provider.ts` — единая точка смены провайдера:
  `setProviderId` → `removeQueries(['quiz'])` → `sessionStore.reset()` →
  `navigate({ to: '/setup' })`. Вызывается из диалога, авто-смены на setup и
  настроек.

## Подзадачи

### T0. Синхронизация git-состояния ✅ (15.10.2026)

- [x] Незакоммиченные изменения откачены: `src/shared/api/quizapi.ts`
  (circuit-breaker для withFallback) — `git checkout`; untracked
  `src/shared/api/quizapi-fallback.test.ts` — удалён. Working tree чист.

### T1. Typed-ошибки: `src/shared/api/errors.ts` ✅ (15.10.2026)

- [x] `ErrorKind = 'auth' | 'rate_limit' | 'parse' | 'http' | 'network' | 'timeout'`.
- [x] `QuizApiError extends Error` с полем `kind`, полезной нагрузкой
  (status, providerId, url — по возможности).
- [x] `classifyError(err: unknown, providerId): QuizApiError` — обёртка поверх
  fetch-исключений: AbortError(TimeoutError) → `timeout`; TypeError/fetch reject →
  `network`; 401/403 → `auth`; 429 → `rate_limit`; ошибка zod-парсинга → `parse`;
  прочие 4xx/5xx → `http`.
- [x] Применить в обоих клиентах: все throw'ы заворачиваются в `QuizApiError`
  (сохраняя исходные сообщения, в т.ч. подстроки `'Invalid or expired'`,
  `'Rate limit exceeded'`). Примечание: применено в `quizapi.ts` — клиент
  переедет в `quizapi-client.ts` на T2. Семантические ошибки («невалидные
  данные/пустой ответ») получили `kind: 'parse'` (ревью).
- Критерий: `classifyError` покрыт unit-тестами; клиенты бросают только
  `QuizApiError`.

### T2. Реестр провайдеров ✅ (15.10.2026)

- [x] `src/shared/api/quizapi-client.ts`: перенесён из `quizapi.ts` —
  `API_BASE`, `REQUEST_TIMEOUT_MS`, `getApiKey`, `buildQuestionsUrl`,
  `getInitialFetchLimit`, `SURVIVAL_BATCH_SIZE`, `fetchQuizApiQuestions`,
  `fetchQuizApiMetadata`, `fetchQuizApiCategories`; экспортировать их.
- [x] `src/shared/api/providers.ts`: типы `ProviderId`, `QuizProvider`,
  `QuestionsFetchOptions`, `QuestionsPage` (перенести/переэкспортировать, чтобы
  не было цикла с `triviaapi.ts`), реестр, `getProvider`, `getAvailableProviders`
  (mock только при `import.meta.env.DEV || VITE_USE_MOCK_DATA === 'true'`),
  `alternateProviderId`.
- [x] `src/shared/api/mockapi.ts`: mock-провайдер — обёртка над
  `fetchMockQuestions/fetchMockMetadata/fetchMockCategories`
  (`src/shared/api/mock-*.ts`) с адаптацией под интерфейс провайдера.
- [x] Из `quizapi.ts` удалить: `withFallback`, мок-ветки `USE_MOCK` из
  fetch-функций, импорты `triviaapi`/`mock-*`; fetch-функции стали тонкими
  делегатами `getProvider(DEFAULT_PROVIDER_ID)` (временное поведение до T4).
- [x] `src/shared/api/quizapi-fallback.test.ts` удалён (на T0).
- [x] Обновить импорты в `triviaapi.ts` (QuestionsPage из `./providers`,
  `import type`) — плюс `use-question-feed.ts` (отклонение: тоже импортировал
  QuestionsPage из quizapi).
- Критерий: `typecheck && lint && test` зелёные (22 файла / 216 тестов);
  фолбэка в коде нет.

### T3. Стор провайдера: `src/shared/api/provider-store.ts` ✅ (15.10.2026)

- [x] Zustand + persist: ключ `quiz-provider`, `version: 1`,
  `createJSONStorage(() => localStorage)`, zod-`merge` по образцу
  `src/app/settings-store.ts` (corrupt → default), `partialize: { providerId }`.
- [x] `DEFAULT_PROVIDER_ID = USE_MOCK ? 'mock' : 'quizapi'`; в `merge` при
  `USE_MOCK === true` форсировать `providerId: 'mock'`.
- [x] `setProviderId(id)`.
- [x] Тест `provider-store.test.ts`: 7 тестов (дефолт, set, персист/rehydrate,
  corrupt → default, форс mock). 23 файла / 223 теста — зелёные.
- Критерий: стор переживает reload (localStorage), миграций с legacy нет
  (ключ новый).

### T4. Хуки TanStack Query: providerId в ключах и диспатче ✅ (15.10.2026)

В `src/shared/api/quizapi.ts`:

- [x] `useQuizQuestions`, `useQuestionBatch`, `useMetadata`, `useCategories`
  подписываются на `useProviderStore((s) => s.providerId)`; providerId попадает
  и в queryKey, и в замыкание `queryFn` (одно значение — нет гонки).
- [x] `queryFn` диспатчит через `getProvider(providerId).fetch*`. Временные
  делегаты fetchQuestions/fetchMetadata/fetchCategories удалены (использовались
  только внутри quizapi.ts).
- [x] `retryQuestions` переписан на матчинг по `QuizApiError.kind`:
  только `network` → retry (count < 2); `auth`/`rate_limit`/`parse`/`http` →
  без авто-retry (сразу диалог/авто-смена по политике). *Timeout перенесён
  из retry-бакета 15.10.2026 (HAR) — см. открытые вопросы №3.*
- [x] Тест `quizapi-dispatch.test.ts`: 6 тестов (диспатч по домену провайдера,
  смена провайдера в рантайме, отсутствие фолбэка при 500). 24 файла / 229
  тестов — зелёные.
- Критерий: смена providerId меняет queryKey (кеши не смешиваются).

### T5. queryClient + `useChangeProvider` ✅ (15.10.2026)

- [x] `src/app/query-client.ts`: вынести `queryClient` из
  `src/app/providers.tsx`, обновить импорт в providers.tsx.
- [x] `src/features/provider/use-change-provider.ts`:
  `changeProvider(next?: ProviderId)` =
  `setProviderId(next ?? alternateProviderId(current))` →
  `queryClient.removeQueries({ queryKey: ['quiz'] })` →
  `sessionStore.getState().reset()` → `navigate({ to: '/setup' })`.
- [x] `src/shared/lib/session-store.ts`: `reset()` чистит `sessionStartTime`
  + попутно `timeRemaining` (shallow-merge zustand хранил stale-таймер).
- [x] Тест `use-change-provider.test.tsx`: 3 теста (полный цикл, явный
  аргумент, порядок). session-store.test.ts +1. 25 файлов / 233 теста — зелёные.
- Критерий: после `changeProvider` сессия пуста, кеш `['quiz']` чищен,
  мы на `/setup`.

### T6. Диалог ошибки в сессии: `src/shared/ui/api-error-dialog.tsx` ✅ (15.10.2026)

- [x] Компонент по мотивам `confirm-dialog.tsx`: `role="alertdialog"`,
  `aria-modal`, aria-labelledby/describedby, фокус на Retry при открытии,
  Escape/оверлей НЕ закрывают (только выбор действия).
- [x] Props: `open`, `providerLabelKey`, `errorMessage?`, `retrying`,
  `switching?`, `onRetry`, `onChangeApi`. Кнопки `data-testid`, обе
  `disabled={retrying || switching}`.
- [x] Retry = `refetch()`; диалог остаётся открытым со спиннером, закрывается
  при успехе. Change API = `changeProvider()`.
- [x] Защита от переоткрытия: `dialogOpen` — единственный источник (derive
  state during render), новые error-триггеры диалог не «переоткрывают».
- [x] `use-quiz-session.ts`: возврат расширен — `refetch`, `isFetching`
  (через in-сужение union-типа).
- [x] `quiz-screen.tsx`: QuizError и inline-алерт батча заменены диалогом;
  источники разведены (initialError vs batchError).
- [x] Кнопка «End run» убрана из UI (finishWithoutBatch в хуках оставлен).
- [x] Тест `api-error-dialog.test.tsx`: 7 тестов (включая disabled при
  retrying, инертность Escape/оверлея, фокус). Секция `api_error` в en/ru.
  26 файлов / 240 тестов — зелёные.
- Критерий: ошибки начальной загрузки и survival-батча показывают диалог;
  «End run» в UI отсутствует.

### T7. Setup-screen: авто-смена провайдера + тост (вне сессии) ✅ (15.10.2026)

- [x] Тост `src/shared/ui/app-toast.tsx` (aria-live, авто-скрытие 5с,
  ручной dismiss; achievement-toast не тронут).
- [x] `setup-screen.tsx`: чтение `error`/`refetch` из useMetadata/useCategories.
- [x] Политика по матрице: broken-kind (auth/rate_limit/parse/http/timeout) →
  авто-смена `changeProvider(next)` + тост (один раз за mount, защита от
  цикла через снапшот `switchedFrom`); network → inline-ошибка +
  Retry; новый упавший провайдер → inline без повторной смены.
  (timeout перенесён в broken 15.10.2026 по HAR — открытые вопросы №3.)
- [x] Логика — в хук `src/views/setup-screen/hooks/use-provider-fallback.ts`
  (отделимость от тяжёлого экрана, покрыт unit-тестом).
- [x] i18n: `provider.*`, `provider_switch.*`, `setup.load_error` (en/ru).
- [x] Тесты: app-toast (4) + use-provider-fallback (7). 28 файлов / 251
  тест — зелёные.
- Критерий: упавший quizapi на setup без вмешательства приводит к trivia
  с тостом; network-ошибка не меняет провайдера.

### T8. Переключатель в настройках ✅ (15.10.2026)

- [x] `settings-screen.tsx`: секция «Источник вопросов» + `SegmentedControl`
  (testId `provider-selector`, иконки 🧠/🎲/🧪, опции из
  `getAvailableProviders()`), hint-текст.
- [x] `onChange` → `changeProvider(id)` через единую точку; при активной
  сессии (`isSessionActive`: loading/playing/answered — хелпер добавлен в
  session-store) — `ConfirmDialog` (testId `provider-switch-confirm`,
  проп `testId` добавлен в confirm-dialog).
- [x] i18n: `settings.api_provider*` (en/ru). Тесты +4 (isSessionActive,
  confirm-dialog testId). 29 файлов / 255 тестов — зелёные.
- Примечание (правка после приёмки): mock убран из ручного переключателя —
  `getSwitcherProviders(current)` показывает mock лишь пока он активен
  (env-режим дев/e2e); уход с mock убирает ручной возврат, решает
  env-флаг при следующей загрузке.
- Критерий: ручная смена сбрасывает сессию и ведёт в setup; вне сессии —
  без подтверждения.

### T9. i18n + динамический футер (en.json / ru.json) ✅ (15.10.2026)

- [x] Футер динамический по providerId: `ProviderFooter` в
  `root-layout.tsx`; для trivia — ссылки на the-trivia-api.com и
  CC BY-NC 4.0 (i18n-фрагменты prefix/mid/suffix вокруг JSX-ссылок,
  `target="_blank" rel="noopener noreferrer"`).
- [x] Ключи: `app.footer_quizapi/footer_trivia_*/footer_mock` заменили
  `app.footer`; удалены ставшие мёртвыми `quiz.batch_error`,
  `quiz.finish_now` (grep). Секции T6–T8 сверены — симметричны en/ru.
- [x] Тест `root-layout.test.tsx` (3 теста: ссылки trivia, строки quizapi/mock).
  30 файлов / 258 тестов — зелёные.
- [ ] legal-review: открытый вопрос (см. «Открытые вопросы») — атрибуция
  показывается только при активном trivia.

### T10. Unit-тесты (сводка) ✅ (15.10.2026)

Все тесты писались в рамках задач T1–T9, сводка состава:

- [x] `errors.test.ts` (12) — classifyError по всем kind.
- [x] `provider-store.test.ts` (7), `providers.test.ts` (7),
  `quizapi-dispatch.test.ts` (6), `api-error-dialog.test.tsx` (7),
  `use-change-provider.test.tsx` (3), `api-error-dialog` — см. T3–T6.
- [x] `session-store.test.ts` — reset чистит sessionStartTime/timeRemaining,
  isSessionActive (T5/T8).
- [x] `quizapi.test.ts` обновлён (импорты из quizapi-client, T2).
- [x] `triviaapi.test.ts`, `adapter.test.ts`, `schemas.test.ts` — не сломаны.
- Итог: 30 файлов / 258 тестов — зелёные; fallback-тест удалён на T0.

### T11. E2E (Playwright): `e2e/provider-switch.spec.ts` ✅ (15.10.2026)

Всё офлайн через `page.route()` (e2e идёт с mock + DEV):

- [x] Settings → переключатель виден, выбор The Trivia API → редирект на
  `/setup`, данные грузятся из trivia-фикстур. Тег `@smoke`.
- [x] Интерсептить quizapi и trivia → 500: старт квиза → диалог
  «Retry / Change API»; Retry (всё ещё 500) → диалог остаётся, дабл-клики не
  приводят к двойному вызову; Change API → редирект на `/setup`, сессия
  сброшена (URL-guard `/quiz` кидает в setup).
- [x] Survival: батч падает (route 500 на offset > 0) → диалог; Change API →
  setup.
- [x] Setup: quizapi → 500 (auth/http) → авто-переключение на trivia + тост;
  network-ошибка → inline Retry без смены провайдера.
- [x] Правила e2e: использовать `e2e/fixtures.ts`, предпочтительные локаторы,
  теги `@smoke`/`@slow`.
- Критерий: `npm run e2e` зелёный.

Итог: 5 сценариев в `e2e/provider-switch.spec.ts`; официальные фикстуры
обоих API и route-хелперы — `e2e/api-fixtures.ts` (`routeQuizApi`,
`routeTrivia`, `abortTrivia`); в `e2e/fixtures.ts` добавлены
`selectProvider`, `startFromCurrentSetup`, `answerTriviaCorrectly`
(старт без `page.goto` — reload форсирует providerId='mock').

В процессе найдены и исправлены два бага:

1. **Утечка click-event в `ApiErrorDialog`** — кнопка Change API была
   `onClick={onChangeApi}`; React передавал событие в
   `changeProvider(next?)`, который принимал его за providerId:
   `setProviderId(MouseEvent)` крашил persist (`JSON.stringify`
   циклической структуры) и хеш query-ключа, навигация не происходила.
   Исправление — обёртка `onClick={() => onChangeApi()}` (+ `onRetry`)
   и регрессионный тест на нулевой arity колбэков
   (`api-error-dialog.test.tsx`).
2. **`quiz.spec.ts` красился с HEAD** (остаток коммита 5e49ab7):
   `getByText('1/2')` ловил strict mode (h2 + sr-only live-region оба
   содержат прогресс), а survival-тест ждал старый формат '1 of 12'.
   Ассерты переведены на `getByRole('heading', { name: 'Question N/M' })`.

Проверки: typecheck ✅ lint ✅ 258 unit-тестов ✅; `npm run e2e` — 44/44;
`--repeat-each=3` по provider-switch.spec — 15/15 без флаканья.

### T12. Документация ✅ (15.10.2026)

- [x] Переписать `docs/api-notes.md` §28 (там описан withFallback) — секция
  про выбор провайдера и политику ошибок.
- [x] Обновить `AGENTS.md` / `README.md` (описание фолбэка → описание
  переключателя провайдеров, env-флаги).
- Критерий: доки соответствуют реализации.

Итог: §28 → «Выбор провайдера вопросов и политика ошибок» (реестр,
persist-стор, три пути смены, таблица kind→реакция, справка по Trivia API
сохранена). README: введение с двумя live-провайдерами, env-таблица
(ключ только для quizapi, mock сбрасывает providerId), архитектура,
ограничения, структура. AGENTS.md: Env, API layer, e2e-правило про
`api-fixtures.ts` и запрет goto/reload после смены провайдера.

## Открытые вопросы

1. **Оба провайдера упали** (решение №6 — разобрать последним этапом):
   пользователь может переключаться бесконечно. Варианты к обсуждению:
   показывать в диалоге историю «куда уже переключались» и блокировать повторно;
   держать «последнего упавшего» и разрешать только Retry; единая
   «деградированная» страница. Решение принимается после T6–T8, когда базовый
   флоу готов.
2. **legal-review атрибуции** (T9): динамический футер по providerId —
   согласовать юридически; фолбэк-вариант «всегда показывать обе подписи».
3. **timeout = network?** — **решено 15.10.2026 по факту** (HAR:
   quizapi.io вис >10с, обрывы ровно `AbortSignal.timeout(10_000)`):
   timeout → кандидат на смену, без авто-retry (в T1 отнесён к «retry
   того же провайдера» — пересмотрено).

## Definition of done

- Автоматический фолбек (`withFallback`, circuit-breaker) удалён полностью.
- providerId хранится в persist-сторе, участвует в query-ключах.
- Ошибки в сессии → диалог «Retry / Change API»; вне сессии → авто-смена
  + тост (кроме network).
- Смена провайдера (диалог, авто-смена, настройки) всегда: сброс кеша
  `['quiz']` → reset сессии → `/setup` → данные грузятся новым API.
- Переключатель в настройках работает, включая подтверждение при активной
  сессии.
- Футер динамический, атрибуция CC BY-NC 4.0 при trivia.
- `npm run typecheck && npm run lint && npm run test && npm run e2e` зелёные;
  docs обновлены.
