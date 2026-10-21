# Документация

Документация для разработчиков и AI-агентов. Где что искать: «хочу
понять внешний API» → справочники upstream-файлов; «хочу понять
поведение приложения при ошибках/смене источника» → providers.md; «хочу
понять, что ходит наружу и как это деплоится» → proxy-server.md.

- [quizapi-upstream.md](quizapi-upstream.md) — справочник внешнего
  QuizAPI v1 (только используемые эндпоинты: questions browse,
  metadata, categories)
- [trivia-upstream.md](trivia-upstream.md) — справочник The Trivia API
  v2, маппинг категорий, атрибуция CC BY-NC
- [providers.md](providers.md) — реестр провайдеров вопросов, политика
  ошибок и явного переключения, правило моков
- [proxy-server.md](proxy-server.md) — контракт NestJS-прокси
  (`/api/quiz/*`), конверт ошибок, env, деплой на Vercel
- [analytics.md](analytics.md) — PostHog: события, мониторинг ошибок,
  приватность, env клиента и сервера
- [../PLAN.md](../PLAN.md) — оставшаяся работа (§1) и зафиксированные
  отклонения от первоначального плана (§2)
