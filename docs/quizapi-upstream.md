# QuizAPI v1 — внешний API (используемые части)

QuizAPI — REST API для работы с квизами и вопросами: поиск вопросов по
категориям, сложности, типу и тегам, а также таксономия
`Topic → Category → Tags`. Наше приложение ходит ровно в три эндпоинта:
`GET /api/v1/questions` (browse mode с фильтрами), `GET /api/v1/metadata`
и `GET /api/v1/categories`.

- **Base URL:** `https://quizapi.io/api/v1`
- **Документация:** https://quizapi.io/docs
- **OpenAPI:** `https://quizapi.io/api/v1/openapi.json` — source of
  truth при расхождении документации и примеров.

## Версии: не смешивать v1 и v2

Документированный контракт — v1: `https://quizapi.io/api/v1` (OpenAPI
v1: `https://quizapi.io/api/v1/openapi.json`). На главной странице
QuizAPI встречаются примеры с `/api/v2` — их нельзя автоматически
переносить в v1-клиент. Если задача относится к v2, сначала проверить
отдельную актуальную спецификацию v2, а не предполагать совместимость с
v1.

## Authentication

QuizAPI использует API keys; ключ создаётся в dashboard QuizAPI.
Рекомендуемый способ передачи — заголовок:

```http
Authorization: Bearer YOUR_API_KEY
```

Допустимо передавать ключ query-параметром:

```text
?api_key=YOUR_API_KEY
```

Но для production использовать header: query-параметры могут попасть в
логи proxy/server.

Форматы ключей:

- `qza_live_...` — production;
- `qza_test_...` — testing/development.

Ошибка authentication:

```http
401 Unauthorized
```

```json
{
  "success": false,
  "error": "Invalid API key."
}
```

## Общий формат ответа

Успешный ответ обычно содержит:

```json
{
  "success": true,
  "data": {}
}
```

Для list/browse endpoints используется:

```json
{
  "success": true,
  "data": [],
  "meta": {}
}
```

Ошибки:

```json
{
  "success": false,
  "error": "Something went wrong."
}
```

Не следует предполагать, что все endpoint'ы имеют одинаковый `meta`: его
структура зависит от конкретного endpoint.

## Общие enum

### Difficulty

Допустимые значения:

```text
EASY
MEDIUM
HARD
EXPERT
```

У нас используются `easy` / `medium` / `hard`: значение `EXPERT`
отфильтровывается на сервере (см. docs/proxy-server.md).

### QuestionType

Допустимые значения:

```text
MULTIPLE_CHOICE
TRUE_FALSE
OPEN_ENDED
```

## GET /api/v1/metadata

Discovery endpoint. API key не требуется.

Возвращает:

- доступные difficulty;
- типы вопросов;
- категории;
- теги;
- aggregate statistics.

Пример структуры:

```json
{
  "success": true,
  "data": {
    "difficulties": ["EASY", "MEDIUM", "HARD", "EXPERT"],
    "questionTypes": [
      "MULTIPLE_CHOICE",
      "TRUE_FALSE",
      "OPEN_ENDED"
    ],
    "categories": ["Programming", "DevOps", "Science"],
    "tags": ["javascript", "python", "docker"],
    "stats": {
      "totalQuizzes": 150,
      "totalQuestions": 3200
    }
  }
}
```

Используется для каталога сложностей: перед построением динамических
фильтров удобно сначала запросить `GET /api/v1/metadata`.

## GET /api/v1/categories

Discovery endpoint. API key не требуется.

Возвращает иерархию:

```text
Topic
  └── Category
        └── Tags
```

Пример:

```json
{
  "success": true,
  "data": [
    {
      "id": "topic_abc123",
      "name": "Programming",
      "slug": "programming",
      "icon": "code",
      "categories": [
        {
          "id": "cat_python",
          "name": "Python",
          "slug": "python",
          "quizCount": 12,
          "tags": [
            "python",
            "basics",
            "data-structures"
          ]
        }
      ]
    }
  ]
}
```

### Поля Category

| Поле         | Тип           | Описание                       |
| ------------ | ------------- | ------------------------------ |
| `id`         | string        | ID topic/category              |
| `name`       | string        | Название                       |
| `slug`       | string        | URL-friendly slug              |
| `icon`       | string/null   | Иконка topic                   |
| `categories` | array         | Категории внутри topic         |
| `quizCount`  | integer       | Количество опубликованных квизов |
| `tags`       | string[]      | Популярные теги, максимум 20   |

Категории с `quizCount = 0` фильтруются на нашей стороне — в каталог
попадают только категории с хотя бы одним опубликованным квизом
(см. docs/proxy-server.md).

## GET /api/v1/questions (browse mode)

Если `quiz_id` не передан, endpoint работает в browse mode: поиск
вопросов среди опубликованных квизов.

> **Примечание:** у endpoint'а есть второй режим —
> `GET /api/v1/questions?quiz_id=...` (вопросы конкретного квиза, ответы
> не включаются без `include_answers=true`). В проекте этот режим не
> применяется.

### Parameters

| Parameter    | Описание                              |
| ------------ | ------------------------------------- |
| `category`   | Категория; несколько значений через comma |
| `difficulty` | Difficulty; несколько значений через comma |
| `type`       | Question type; несколько значений через comma |
| `tags`       | Теги через comma                      |
| `limit`      | 1–50, default 10                      |
| `offset`     | default 0                             |
| `random`     | `"true"` — случайно перемешать        |

Фильтры case-insensitive. В browse mode `answers` включаются всегда.

### Пример

```bash
curl -X GET \
  "https://quizapi.io/api/v1/questions?category=Programming,DevOps&difficulty=EASY,MEDIUM&type=MULTIPLE_CHOICE&tags=javascript,react&limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Пример response

Структура BrowseQuestion: `id`, `text`, `type`, `difficulty`,
`explanation`, `category`, `tags`, `quizId`, `quizTitle`, `answers[]`.

```json
{
  "success": true,
  "data": [
    {
      "id": "ques_xyz789",
      "text": "What is the typeof null in JavaScript?",
      "type": "MULTIPLE_CHOICE",
      "difficulty": "MEDIUM",
      "explanation": "typeof null returns 'object' due to a legacy bug.",
      "category": "Programming",
      "tags": ["javascript", "fundamentals"],
      "quizId": "quiz_abc123",
      "quizTitle": "JavaScript Essentials",
      "answers": [
        { "id": "ans_1", "text": "null", "isCorrect": false },
        { "id": "ans_2", "text": "object", "isCorrect": true },
        { "id": "ans_3", "text": "undefined", "isCorrect": false },
        { "id": "ans_4", "text": "string", "isCorrect": false }
      ]
    }
  ],
  "meta": {
    "total": 23,
    "pageTotal": 1,
    "page": 1,
    "lastPage": 3,
    "limit": 10,
    "offset": 0,
    "links": {
      "first": "/api/v1/questions?...&offset=0&limit=10",
      "last": "/api/v1/questions?...&offset=20&limit=10",
      "next": "/api/v1/questions?...&offset=10&limit=10",
      "prev": null
    }
  }
}
```

## Пагинация browse mode

Для browse mode `meta` содержит:

| Поле        | Тип     | Описание                             |
| ----------- | ------- | ------------------------------------ |
| `total`     | integer | Общее число вопросов по фильтрам     |
| `pageTotal` | integer | Вопросов в текущей странице          |
| `page`      | integer | Текущая страница (1-based)           |
| `lastPage`  | integer | Последняя страница                   |
| `limit`     | integer | Значение limit                       |
| `offset`    | integer | Значение offset                      |
| `links`     | object  | Ссылки: first, last, next, prev      |

```json
{
  "total": 23,
  "pageTotal": 10,
  "page": 1,
  "lastPage": 3,
  "limit": 10,
  "offset": 0,
  "links": {
    "first": "/api/v1/questions?offset=0&limit=10",
    "last": "/api/v1/questions?offset=20&limit=10",
    "next": "/api/v1/questions?offset=10&limit=10",
    "prev": null
  }
}
```

## Rate limits

Общий documented limit:

```text
60 requests/minute/IP
```

При превышении:

```http
429 Too Many Requests
Retry-After: 60
```

```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}
```

Best practices:

- кэшировать редко меняющиеся данные;
- не делать повторные одинаковые запросы без необходимости;
- при `429` читать `Retry-After`;
- использовать retry с backoff;
- добавлять jitter;
- не выполнять бесконечные retries.

## HTTP status codes

| Code | Значение                                        |
| ---- | ----------------------------------------------- |
| 200  | Успешный GET                                    |
| 201  | Resource created                                |
| 400  | Bad request / invalid JSON / invalid params     |
| 401  | Missing/invalid API key                         |
| 403  | Нет прав / недостаточный plan                   |
| 404  | Resource not found                              |
| 422  | Validation failed                               |
| 429  | Rate limit exceeded                             |
| 500  | Internal server error                           |

Не все endpoints используют все перечисленные коды.

## Curl reference

### Metadata

```bash
curl "https://quizapi.io/api/v1/metadata"
```

### Категории

```bash
curl "https://quizapi.io/api/v1/categories"
```

### Browse questions

```bash
curl "https://quizapi.io/api/v1/questions?difficulty=MEDIUM&type=MULTIPLE_CHOICE&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Source of truth

1. API docs: https://quizapi.io/docs
2. Authentication: https://quizapi.io/docs/authentication
3. Questions: https://quizapi.io/docs/questions
4. Categories: https://quizapi.io/docs/categories
5. Rate Limits: https://quizapi.io/docs/rate-limits
6. OpenAPI: https://quizapi.io/api/v1/openapi.json
