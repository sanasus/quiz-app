# Аналитика и мониторинг ошибок (PostHog)

Один инструмент на два дела: продуктовые события и исключения. Код
клиента — `src/shared/analytics/`, сервера — `server/src/analytics/`.

## Когда собирается

Только в **production** и только при заданном ключе. Выключено в dev, при
`VITE_USE_MOCK_DATA`, в e2e и CI (там нет `PROD`/ключа), так что прогоны не
засоряют статистику. Сервер: `NODE_ENV=production` + `POSTHOG_KEY`.

## Приватность

Режим без cookie (`persistence: 'memory'`), без autocapture, без записи
сессий, без персональных данных, EU-облако — баннер согласия не нужен.
Запись сессий включать только отдельным решением.

## Клиент

- `VITE_POSTHOG_KEY` — публичный ключ проекта (только запись событий).
  Единственное осознанное исключение из «ключ не попадает в браузер»,
  см. AGENTS.md.
- `VITE_POSTHOG_HOST` — по умолчанию `/ingest`: запросы идут через наш
  домен (rewrites в `vercel.json` → `eu.i.posthog.com` и
  `eu-assets.i.posthog.com`), чтобы их не резали блокировщики рекламы.
- `posthog-js` грузится лениво (отдельный чанк после первого события).
- Просмотры страниц шлёт `RootLayout` при смене маршрута (SPA).
- Исключения: необработанные ошибки и промисы (`capture_exceptions`) и
  ошибки рендера из `ErrorPage`.

## События (`events.ts`)

| Событие             | Свойства                                                          |
| ------------------- | ----------------------------------------------------------------- |
| `quiz_started`      | mode, difficulty, category, provider, repeats                     |
| `quiz_finished`     | то же + abandoned, correct, total, score                          |
| `provider_switched` | from, to, reason (`settings` / `error_dialog` / `auto_setup`), kind |
| `share_clicked`     | outcome (`shared` / `copied-image` / `downloaded` / `cancelled` / `failed`) |
| `question_reported` | provider                                                          |

`quiz_finished` с `abandoned: true` шлётся при подтверждённом выходе из
игры и при «Начать заново» на экране продолжения; закрытие вкладки не
отслеживается.

## Сервер

`UpstreamErrorFilter` отправляет каждый `UpstreamError` в PostHog с тегами
`kind` и `providerId` (`AnalyticsService`, `posthog-node`). Отправка
немедленная (`captureExceptionImmediate`, без батчей) и после записи
ответа: она не задерживает и не ломает ответ клиенту. Env: `POSTHOG_KEY`,
`POSTHOG_HOST` (по умолчанию `https://eu.i.posthog.com`).

## Source maps

Сборка выпускает `sourcemap: 'hidden'` (карты есть в `dist/`, но бандлы на
них не ссылаются). Чтобы стектрейсы в PostHog читались, карты нужно
загрузить в PostHog при деплое (`posthog-cli sourcemap`, нужен personal API
key в секретах CI) — этот шаг пока **не настроен**.

## Не проверено

- Лимиты бесплатного плана перепроверить на официальной странице цен
  перед подключением.
- `rewrites` для `/ingest` в `vercel.json` не проверены на реальном
  деплое (конфиг с `services`).
