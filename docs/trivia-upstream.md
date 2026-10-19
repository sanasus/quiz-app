# The Trivia API v2 — внешний API

**The Trivia API v2** — бесплатный API вопросов, работает без API-ключей:

```text
https://the-trivia-api.com/v2
```

Реализация обращения к апстриму живёт на сервере
(`server/src/quiz/upstream/`, см. docs/proxy-server.md); как выбирается
источник вопросов — см. docs/providers.md. Здесь — справка самому API.

## Эндпоинты

| Запрос                                                          | Описание                                          |
| --------------------------------------------------------------- | ------------------------------------------------- |
| `GET /questions?limit=&offset=&difficulties=&categories=&types=` | Вопросы с фильтрами                              |
| `GET /questions/count?<те же фильтры>`                           | Точный размер пула — аналог `meta.total`         |
| `GET /metadata`                                                  | Метаданные; `byCategory` перечисляет 10 канонических категорий |
| `GET /categories`                                                | Плоский record `displayName` → slug-и, 10 категорий |

## Параметры GET /questions

- `limit` — клампится на 50.
- `offset` — v2 сейчас игнорирует (параметр шлём на будущее).
- `difficulties` — одно lowercase-значение из `config.difficulty`.
- `types` — всегда `text_choice` (`text_input` без ключа даёт 401).
- `categories` — отправляется только при успешном маппинге слага;
  неизвестный слаг API молча подменяет на `general_knowledge`.

Поскольку `offset` игнорируется, исчерпание пула детектируется на
клиенте: `addQuestionBatch` (`src/shared/lib/session-store.ts`)
дедуплицирует вопросы по `id`; если `added === 0`, пул считается
исчерпанным (`questionsExhausted`).

## Маппинг категорий

`resolveTriviaCategory` в `server/src/quiz/upstream/category-mapping.ts`
преобразует выбранный слаг категории в канонический слаг trivia.
Полная таблица соответствий:

| Канонический trivia slug | Слаги-источники                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `science`                | physics, chemistry, biology, astronomy, earth-science, genetics, ecology, neuroscience, quantum-physics, climate-science, marine-biology, paleontology |
| `history`                | world-wars, ancient-history, medieval-history, modern-history, american-history, european-history, asian-history, ancient-rome, ancient-greece, cold-war, renaissance, industrial-revolution |
| `geography`              | world-capitals, africa, europe, asia, americas, mountains, rivers, oceans, countries, flags        |
| `arts_and_literature`    | classic-literature, shakespeare, poetry, modern-fiction, science-fiction, fantasy, world-literature, literary-devices, nobel-laureates, children-s-literature, art-and-architecture |
| `film_and_tv`            | movies, tv-shows, anime                                                                           |
| `music`                  | music                                                                                             |
| `sport_and_leisure`      | sports                                                                                            |
| `food_and_drink`         | food-and-drink                                                                                    |
| `general_knowledge`      | trivia, fun-facts, world-records, inventions, famous-people, languages, philosophy, health-and-wellness |
| `society_and_culture`    | mythology                                                                                         |

Trivia-алиасы (отображаемые `/v2/categories`) нормализуются в канон:

| Алиасы                              | Канон                 |
| ----------------------------------- | --------------------- |
| arts, literature, novels            | `arts_and_literature` |
| movies, film                        | `film_and_tv`         |
| food, drink, alcohol                | `food_and_drink`      |
| society, culture                    | `society_and_culture` |
| sports, sport, games                | `sport_and_leisure`   |

Канонические слаги маппятся на себя:
`arts_and_literature`, `film_and_tv`, `food_and_drink`,
`general_knowledge`, `geography`, `history`, `music`, `science`,
`society_and_culture`, `sport_and_leisure`.

Без фильтра — `resolveTriviaCategory` возвращает `null`, запрос уходит
на весь пул:

- `programming`, `devops-and-cloud`, `database`, `cybersecurity`,
  `mathematics`, `business-and-finance` (а также листы pop-culture
  `video-games`, `comics`, `celebrities`, `fashion` — у их topic нет
  trivia-соответствия);
- `'all'`, пустое или неизвестное значение.

## Атрибуция

Атрибуция **CC BY-NC 4.0** обязательна. Футер показывает её только при
активном trivia — ключи `app.footer_trivia_*` в `src/locales/en.json` и
`src/locales/ru.json`.
