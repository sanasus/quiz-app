# QuizAPI --- документация для AI-агента

> Сводная agent-oriented документация по официальной документации
> QuizAPI.
>
> **Основной контракт:** QuizAPI REST API v1\
> **Base URL:** `https://quizapi.io/api/v1`\
> **OpenAPI:** `https://quizapi.io/api/v1/openapi.json`
>
> Источники: https://quizapi.io/docs,
> https://quizapi.io/api/v1/openapi.json

## ⚠️ Правило: моки для всего API

> **При добавлении любого нового API-эндпоинта — обязательно создай мок-данные.**
>
> Все моки хранятся в `src/shared/api/mock-*.ts` и включаются через
> `VITE_USE_MOCK_DATA=true` в `.env`.
>
> - `mock-data.ts` — `mockDelay()`, `fetchMockMetadata()`
> - `mock-categories.ts` — `fetchMockCategories()`
> - `mock-questions.ts` — `fetchMockQuestions()`
>
> Каждый мок должен:
> 1. Иметь асинхронную функцию с `await mockDelay()` (800ms) для видимости skeleton-загрузчиков.
> 2. Возвращать данные, совместимые с внутренними типами (`Question`, `Topic`, `Category`, `ApiMetadata`).
> 3. Покрывать все фильтры, которые использует UI (difficulty, category, questionCount).

------------------------------------------------------------------------

## 1. Что такое QuizAPI

QuizAPI --- REST API для работы с квизами и вопросами. API позволяет:

-   получать опубликованные квизы;
-   получать вопросы конкретного квиза;
-   искать вопросы по категориям, сложности, типу и тегам;
-   получать таксономию `Topic → Category → Tags`;
-   создавать квизы;
-   пакетно импортировать вопросы в существующий квиз;
-   встраивать квизы на сайты через Embed;
-   получать webhook-события;
-   использовать OpenAPI-спецификацию для генерации клиентов.

Официальная документация обозначает API как **QuizAPI v1 Reference**.

------------------------------------------------------------------------

## 2. Версии API: важно не смешивать v1 и v2

В документации API используется:

``` text
https://quizapi.io/api/v1
```

На главной странице QuizAPI также встречаются примеры с `/api/v2`. Для
agent-интеграции **не следует автоматически переносить v2-примеры в
v1-клиент**.

### Правило для агента

Если задача относится к официальной API-документации, использовать
**v1**:

``` text
https://quizapi.io/api/v1
```

OpenAPI v1:

``` text
https://quizapi.io/api/v1/openapi.json
```

Если пользователь явно просит v2, сначала проверить отдельную актуальную
спецификацию v2, а не предполагать совместимость с v1.

------------------------------------------------------------------------

# 3. Быстрый старт

## 3.1 Получить API key

API key создаётся в dashboard QuizAPI.

Рекомендуемый способ передачи ключа:

``` http
Authorization: Bearer YOUR_API_KEY
```

Пример:

``` bash
curl -X GET "https://quizapi.io/api/v1/quizzes?limit=5" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

------------------------------------------------------------------------

# 4. Authentication

QuizAPI использует API keys.

## 4.1 Authorization header --- рекомендуемый способ

``` http
Authorization: Bearer YOUR_API_KEY
```

Пример:

``` bash
curl "https://quizapi.io/api/v1/quizzes" \
  -H "Authorization: Bearer qza_live_abc123def456"
```

## 4.2 Query parameter

Допустимо передавать ключ через:

``` text
?api_key=YOUR_API_KEY
```

Пример:

``` bash
curl "https://quizapi.io/api/v1/quizzes?api_key=qza_live_abc123def456"
```

Для production использовать header, поскольку query-параметры могут
попасть в логи proxy/server.

## 4.3 Форматы ключей

Документация описывает:

-   `qza_live_...` --- production;
-   `qza_test_...` --- testing/development.

## 4.4 Ошибка authentication

``` http
401 Unauthorized
```

Пример:

``` json
{
  "success": false,
  "error": "Invalid API key."
}
```

------------------------------------------------------------------------

# 5. Общий формат ответа

Успешный ответ обычно содержит:

``` json
{
  "success": true,
  "data": {}
}
```

Для list/browse endpoints используется:

``` json
{
  "success": true,
  "data": [],
  "meta": {}
}
```

Ошибки:

``` json
{
  "success": false,
  "error": "Something went wrong."
}
```

Не следует предполагать, что все endpoint'ы имеют одинаковый `meta`: его
структура зависит от конкретного endpoint.

------------------------------------------------------------------------

# 6. Общие enum

## Difficulty

Допустимые значения:

``` text
EASY
MEDIUM
HARD
EXPERT
```

## QuestionType

Допустимые значения:

``` text
MULTIPLE_CHOICE
TRUE_FALSE
OPEN_ENDED
```

------------------------------------------------------------------------

# 7. Metadata API

## GET `/api/v1/metadata`

Discovery endpoint. API key не требуется.

Возвращает:

-   доступные difficulty;
-   типы вопросов;
-   категории;
-   теги;
-   aggregate statistics.

Пример:

``` bash
curl "https://quizapi.io/api/v1/metadata"
```

Пример структуры:

``` json
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

### Когда использовать

Перед построением динамических фильтров удобно сначала запросить:

``` text
GET /api/v1/metadata
```

------------------------------------------------------------------------

# 8. Categories API

## GET `/api/v1/categories`

Discovery endpoint. API key не требуется.

Возвращает иерархию:

``` text
Topic
  └── Category
        └── Tags
```

Пример:

``` json
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

### Важное правило

При создании квиза предпочтительно использовать:

``` json
{
  "categoryId": "cat_python"
}
```

а не legacy-поле:

``` json
{
  "category": "Programming"
}
```

### Category fields

  Поле           Тип           Описание
  -------------- ------------- ----------------------------------
  `id`           string        ID topic/category
  `name`         string        Название
  `slug`         string        URL-friendly slug
  `icon`         string/null   Иконка topic
  `categories`   array         Категории внутри topic
  `quizCount`    integer       Количество опубликованных квизов
  `tags`         string\[\]    Популярные теги, максимум 20

------------------------------------------------------------------------

# 9. Quizzes API

## 9.1 GET `/api/v1/quizzes`

Возвращает список опубликованных/доступных квизов с pagination и
фильтрацией.

### Query parameters

  Parameter        Type          Default Описание
  ---------------- --------- ----------- ---------------------------------------
  `topicSlug`      string            --- Фильтр по topic slug
  `categorySlug`   string            --- Фильтр по category slug
  `categoryId`     string            --- Фильтр по category ID
  `category`       string            --- Legacy flat category
  `difficulty`     enum              --- `EASY`, `MEDIUM`, `HARD`, `EXPERT`
  `tags`           string            --- Comma-separated tags
  `topic`          string            --- Text search по title/description/tags
  `sort`           enum        `popular` `popular`, `newest`, `title`
  `limit`          integer          `10` От 1 до 50
  `offset`         integer           `0` Сколько записей пропустить

### Рекомендации по фильтрации

Для taxonomy использовать:

``` text
topicSlug
categorySlug
categoryId
```

Legacy:

``` text
category
```

предпочтительно не использовать для новых интеграций, если можно
применить taxonomy.

### Пример

``` bash
curl -X GET \
  "https://quizapi.io/api/v1/quizzes?topicSlug=programming&sort=newest&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Пример response

``` json
{
  "success": true,
  "data": [
    {
      "id": "quiz_abc123",
      "title": "JavaScript Fundamentals",
      "slug": "javascript-fundamentals",
      "description": "Test your knowledge of JS basics",
      "category": "Programming",
      "categoryId": "cat_javascript",
      "categoryName": "JavaScript",
      "categorySlug": "javascript",
      "topic": "Programming",
      "topicSlug": "programming",
      "difficulty": "MEDIUM",
      "tags": ["javascript", "web"],
      "questionCount": 10,
      "plays": 1250
    }
  ],
  "meta": {
    "total": 42,
    "limit": 10,
    "offset": 0
  }
}
```

------------------------------------------------------------------------

## 9.2 GET `/api/v1/quizzes/{id}`

Получить один квиз по ID.

Возвращает полный quiz object и массив вопросов.

Пример:

``` bash
curl -X GET \
  "https://quizapi.io/api/v1/quizzes/quiz_abc123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Структура:

``` json
{
  "success": true,
  "data": {
    "id": "quiz_abc123",
    "title": "JavaScript Fundamentals",
    "description": "Test your knowledge",
    "difficulty": "MEDIUM",
    "tags": ["javascript"],
    "questionCount": 10,
    "plays": 1250,
    "questions": [
      {
        "id": "q_1",
        "text": "What is the typeof null in JavaScript?",
        "type": "MULTIPLE_CHOICE",
        "difficulty": "MEDIUM",
        "explanation": "typeof null returns 'object'.",
        "order": 1,
        "answers": [
          {
            "id": "a_1",
            "text": "null",
            "isCorrect": false
          },
          {
            "id": "a_2",
            "text": "object",
            "isCorrect": true
          }
        ]
      }
    ]
  }
}
```

------------------------------------------------------------------------

## 9.3 POST `/api/v1/quizzes`

Создать новый квиз.

### Требования

-   Starter или Pro plan;
-   администраторы освобождены от ограничения плана;
-   endpoint имеет лимит 20 requests/min согласно документации создания
    квизов.

### Request body

  Поле            Required   Ограничения
  --------------- ---------- ------------------------------------
  `title`         да         1--200 символов
  `difficulty`    да         `EASY`, `MEDIUM`, `HARD`, `EXPERT`
  `description`   нет        до 2000 символов
  `category`      нет        legacy, до 100 символов
  `categoryId`    нет        предпочтительный category ID
  `tags`          нет        максимум 20, каждый до 50 символов
  `published`     нет        boolean, default `false`
  `featured`      нет        admin-only

### Пример

``` bash
curl -X POST "https://quizapi.io/api/v1/quizzes" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Hooks Quiz",
    "description": "Test your knowledge of React hooks",
    "categoryId": "cat_javascript",
    "difficulty": "MEDIUM",
    "tags": ["react", "hooks"],
    "published": true
  }'
```

### Успешный ответ

HTTP:

``` text
201 Created
```

JSON:

``` json
{
  "success": true,
  "data": {
    "id": "quiz_new789",
    "title": "React Hooks Quiz",
    "description": "Test your knowledge of React hooks",
    "category": "Programming",
    "categoryId": null,
    "difficulty": "MEDIUM",
    "tags": ["react", "hooks"],
    "published": true,
    "featured": false
  }
}
```

------------------------------------------------------------------------

# 10. Questions API

## 10.1 Question object

Базовая структура:

``` json
{
  "id": "ques_xyz789",
  "quizId": "quiz_abc123",
  "text": "What is the typeof null in JavaScript?",
  "type": "MULTIPLE_CHOICE",
  "difficulty": "MEDIUM",
  "explanation": "typeof null returns 'object'.",
  "category": "Programming",
  "answers": [
    {
      "id": "ans_1",
      "text": "null",
      "isCorrect": false
    },
    {
      "id": "ans_2",
      "text": "object",
      "isCorrect": true
    }
  ]
}
```

------------------------------------------------------------------------

## 10.2 GET `/api/v1/questions?quiz_id=...`

Режим получения вопросов конкретного квиза.

### Parameters

  Parameter           Required   Default   Описание
  ------------------- ---------- --------- -----------------------------
  `quiz_id`           да         ---       Quiz ID
  `include_answers`   нет        `false`   `"true"` включает `answers`

### Пример

``` bash
curl -X GET \
  "https://quizapi.io/api/v1/questions?quiz_id=quiz_abc123&include_answers=true" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

В этом режиме вопросы возвращаются в порядке квиза.

### Пример response

``` json
{
  "success": true,
  "data": [
    {
      "id": "ques_xyz789",
      "quizId": "quiz_abc123",
      "text": "What is the typeof null in JavaScript?",
      "type": "MULTIPLE_CHOICE",
      "difficulty": "MEDIUM",
      "explanation": "typeof null returns 'object' due to a legacy bug.",
      "category": "Programming",
      "answers": [
        { "id": "ans_1", "text": "null", "isCorrect": false },
        { "id": "ans_2", "text": "object", "isCorrect": true },
        { "id": "ans_3", "text": "undefined", "isCorrect": false },
        { "id": "ans_4", "text": "string", "isCorrect": false }
      ]
    }
  ],
  "meta": {
    "total": 10,
    "quizId": "quiz_abc123"
  }
}
```

------------------------------------------------------------------------

## 10.3 GET `/api/v1/questions`

Если `quiz_id` не передан, endpoint работает в browse mode.

Можно искать вопросы среди опубликованных квизов.

### Parameters

  Parameter      Описание
  -------------- -----------------------------------------------
  `category`     Категория; несколько значений через comma
  `difficulty`   Difficulty; несколько значений через comma
  `type`         Question type; несколько значений через comma
  `tags`         Теги через comma
  `limit`        1--50, default 10
  `offset`       default 0
  `random`       `"true"` --- случайно перемешать

Фильтры case-insensitive.

> **Как это использует QuizApp (режим «Выживание», порционная
> подгрузка):** живой API вызывается с `random=true` и **без** `offset`
> --- перемешанные выдачи не дают устойчивой пагинации, поэтому
> дубликаты между батчами отсекаются на клиенте по `id` (см.
> `addQuestionBatch` в `src/shared/lib/session-store.ts`). `offset`
> применяется только в моке (`mock-questions.ts`), где один и тот же
> пул режется на не пересекающиеся слайсы: начальная порция ---
> `getInitialFetchLimit` (для «Выживания» всегда 10, настройка
> количества вопросов не действует), далее батчи по
> `SURVIVAL_BATCH_SIZE = 10`, пока пул не кончится.

### Пример

``` bash
curl -X GET \
  "https://quizapi.io/api/v1/questions?category=Programming,DevOps&difficulty=EASY,MEDIUM&type=MULTIPLE_CHOICE&tags=javascript,react&limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

В browse mode `answers` включаются всегда.

### Пример response

``` json
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

### Pagination Meta Object (browse mode)

   Поле         Тип       Описание
   ------------ --------- ----------------------------------------
   `total`      integer   Общее число вопросов по фильтрам
   `pageTotal`  integer   Вопросов в текущей странице
   `page`       integer   Текущая страница (1-based)
   `lastPage`   integer   Последняя страница
   `limit`      integer   Значение limit
   `offset`     integer   Значение offset
   `links`      object    Ссылки: first, last, next, prev

------------------------------------------------------------------------

# 11. Batch Import Questions

## POST `/api/v1/quizzes/{id}/questions/batch`

Добавляет от 1 до 50 вопросов в существующий квиз.

### Важное поведение

Batch выполняется атомарно:

> Если хотя бы один вопрос не проходит validation, вся batch-операция
> отклоняется.

Новые вопросы добавляются после существующих с автоматическим `order`.

### Требования

-   Starter / Pro plan;
-   пользователь должен иметь доступ к квизу;
-   до 50 вопросов за запрос;
-   лимит: 20 requests/min.

### Request

``` json
{
  "questions": [
    {
      "text": "What is a closure in JavaScript?",
      "type": "MULTIPLE_CHOICE",
      "difficulty": "MEDIUM",
      "explanation": "A closure retains access to its outer scope.",
      "answers": [
        {
          "text": "A function with access to outer scope variables",
          "isCorrect": true
        },
        {
          "text": "A browser window operation",
          "isCorrect": false
        }
      ]
    }
  ]
}
```

### Validation

Для каждого вопроса:

-   `text` обязателен;
-   `type` обязателен;
-   `difficulty` обязателен;
-   `answers` обязателен;
-   минимум 2 ответа;
-   минимум один правильный ответ, кроме `OPEN_ENDED`;
-   `TRUE_FALSE` должен иметь ровно 2 ответа.

### Успешный response

``` json
{
  "success": true,
  "data": {
    "quizId": "quiz_abc123",
    "questionsCreated": 1,
    "questions": [
      {
        "id": "ques_new789",
        "text": "What is a closure in JavaScript?",
        "type": "MULTIPLE_CHOICE",
        "difficulty": "MEDIUM",
        "order": 11,
        "answers": [
          {
            "id": "ans_a1",
            "text": "A function with access to outer scope variables",
            "isCorrect": true
          }
        ]
      }
    ]
  }
}
```

### Ошибки

    HTTP Значение
  ------ ----------------------------------
     400 Invalid JSON
     401 Нет/неверный API key
     403 Free plan или нет прав владельца
     404 Quiz not found
     422 Validation failed
     429 Rate limit

------------------------------------------------------------------------

# 12. Pagination

Для browse endpoints используются:

``` text
limit
offset
```

Для questions **по конкретному quiz** (`quiz_id` задан) `meta` содержит:

``` json
{
  "total": 10,
  "quizId": "quiz_abc123"
}
```

Для questions **browse mode** (`quiz_id` отсутствует) `meta` содержит:

``` json
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

### Agent algorithm

Если нужно получить все результаты:

1.  запросить `limit=50`;
2.  начать с `offset=0`;
3.  читать `meta.total`;
4.  пока `offset + pageTotal < total`, увеличивать offset;
5.  учитывать `429` и `Retry-After`.

Не полагаться на наличие `next` у всех endpoints: структура `meta`
различается.

------------------------------------------------------------------------

# 13. Rate Limits

Общий документ указывает:

``` text
60 requests/minute/IP
```

При превышении:

``` http
429 Too Many Requests
```

Сервер возвращает:

``` http
Retry-After: 60
```

Пример:

``` json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}
```

### Best practices

Агент должен:

-   кэшировать редко меняющиеся данные;
-   не делать повторные одинаковые запросы без необходимости;
-   при `429` читать `Retry-After`;
-   использовать retry с backoff;
-   добавлять jitter;
-   не выполнять бесконечные retries.

Пример логики:

``` text
request
  ↓
429?
  ├─ no → process response
  └─ yes
       ↓
  read Retry-After
       ↓
  wait + jitter
       ↓
  retry
```

------------------------------------------------------------------------

# 14. Webhooks

Webhooks доступны на paid plans.

Настраиваются через Dashboard → Webhooks.

### Setup

1.  Создать HTTPS endpoint.
2.  Добавить endpoint в dashboard.
3.  Выбрать events.
4.  Сохранить signing secret.
5.  Использовать Test для проверки endpoint.

Signing secret показывается один раз.

## Headers

Пример:

``` http
Content-Type: application/json
X-QuizAPI-Signature: sha256=...
X-QuizAPI-Event: quiz.completed
X-QuizAPI-Delivery: evt_abc123def456
User-Agent: QuizAPI-Webhooks/1.0
```

## Payload

``` json
{
  "id": "evt_abc123def456",
  "event": "quiz.completed",
  "created_at": "2025-01-16T14:30:00Z",
  "data": {
    "quiz_id": "quiz_abc123",
    "user_id": "user_xyz789",
    "score": 8,
    "total_questions": 10,
    "time_spent": 245,
    "completed_at": "2025-01-16T14:30:00Z"
  }
}
```

## Event types

  -----------------------------------------------------------------------
  Event                               Описание
  ----------------------------------- -----------------------------------
  `quiz.completed`                    Пользователь закончил квиз

  `quiz.created`                      Создан новый квиз

  `quiz.published`                    Квиз опубликован

  `attempt.submitted`                 Отправлена попытка

  `leaderboard.updated`               Обновился leaderboard; в
                                      документации отмечено как Coming
                                      soon
  -----------------------------------------------------------------------

## Security

Каждый webhook содержит HMAC-SHA256 подпись:

``` http
X-QuizAPI-Signature: sha256=...
```

Нужно проверять подпись **до обработки payload**.

Node.js пример:

``` js
const crypto = require("crypto");

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  const expected = `sha256=${expectedSignature}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Retry policy

Если endpoint:

-   возвращает non-2xx;
-   или не отвечает в течение 30 секунд,

QuizAPI повторяет delivery до 3 раз:

  Попытка       Задержка
  ----------- ----------
  1st retry     1 минута
  2nd retry     10 минут
  3rd retry        1 час

После исчерпания retries event считается failed.

------------------------------------------------------------------------

# 15. Embeds

QuizAPI можно встроить на сайт двумя способами:

1.  Script Tag --- рекомендуется;
2.  iFrame.

## 15.1 Script Tag

``` html
<div
  id="quizapi-embed"
  data-quiz-id="quiz_abc123"
></div>

<script src="https://quizapi.io/embed.js"></script>
```

### Options

  Attribute                 Default     Значения
  ------------------------- ----------- -------------------------
  `data-quiz-id`            ---         Quiz ID
  `data-theme`              `auto`      `light`, `dark`, `auto`
  `data-color`              `#6366f1`   HEX color
  `data-show-leaderboard`   `false`     boolean

Пример:

``` html
<div
  id="quizapi-embed"
  data-quiz-id="quiz_abc123"
  data-theme="dark"
  data-color="#6366f1"
  data-show-leaderboard="true"
></div>

<script src="https://quizapi.io/embed.js"></script>
```

## 15.2 JavaScript events

Доступны:

### `quizapi:ready`

Embed полностью загрузился.

### `quizapi:complete`

Payload:

``` text
quizId
score
totalQuestions
timeSpent
```

### `quizapi:answer`

Payload:

``` text
questionId
selectedAnswer
isCorrect
```

Пример:

``` js
window.addEventListener("quizapi:complete", (event) => {
  const {
    quizId,
    score,
    totalQuestions,
    timeSpent
  } = event.detail;

  console.log({
    quizId,
    score,
    totalQuestions,
    timeSpent
  });
});
```

## 15.3 CSS custom properties

Script embed поддерживает:

``` css
#quizapi-embed {
  --quizapi-font-family: system-ui;
  --quizapi-border-radius: 8px;
  --quizapi-primary-color: #6366f1;
  --quizapi-background: #ffffff;
  --quizapi-text-color: #1f2937;
  --quizapi-correct-color: #22c55e;
  --quizapi-incorrect-color: #ef4444;
}
```

------------------------------------------------------------------------

# 16. SDKs

Официальные SDK для:

-   JavaScript/TypeScript;
-   Python

указаны как **in development / coming soon**.

Пока рекомендуется использовать обычный HTTP client.

OpenAPI можно использовать для генерации SDK.

Например:

``` text
OpenAPI → openapi-generator → client library
```

------------------------------------------------------------------------

# 17. OpenAPI

Официальная OpenAPI specification:

``` text
https://quizapi.io/api/v1/openapi.json
```

Версия спецификации:

``` text
OpenAPI 3.1.0
```

OpenAPI полезен для:

-   генерации client SDK;
-   импорта в Postman;
-   генерации типов;
-   проверки request/response schemas;
-   автоматизации API tooling.

------------------------------------------------------------------------

# 18. Основные schemas

## Answer

``` json
{
  "id": "ans_abc123",
  "text": "42",
  "isCorrect": true
}
```

Fields:

``` text
id: string
text: string
isCorrect: boolean
```

## QuizListItem

Основные поля:

``` text
id
title
description
category
categoryId
categoryName
categorySlug
topic
topicSlug
difficulty
tags
questionCount
plays
slug
```

## QuizDetail

То же, что quiz summary, плюс:

``` text
questions[]
```

## QuizQuestionDetail

``` text
id
text
type
difficulty
explanation
order
answers[]
```

## BrowseQuestion

``` text
id
text
type
difficulty
explanation
category
tags
quizId
quizTitle
answers[]
```

------------------------------------------------------------------------

# 19. HTTP status codes

    Code Значение
  ------ ---------------------------------------------
     200 Успешный GET
     201 Resource created
     400 Bad request / invalid JSON / invalid params
     401 Missing/invalid API key
     403 Нет прав / недостаточный plan
     404 Resource not found
     422 Validation failed
     429 Rate limit exceeded
     500 Internal server error

Не все endpoints используют все перечисленные коды.

------------------------------------------------------------------------

# 20. Agent playbook

## Сценарий: найти квиз по теме

1.  Использовать `/api/v1/quizzes`.
2.  Для taxonomy сначала предпочесть `topicSlug` / `categorySlug`.
3.  Для text search использовать `topic`.
4.  При большом количестве результатов использовать pagination.
5.  Для сортировки:
    -   `popular`
    -   `newest`
    -   `title`

Пример:

``` text
GET /api/v1/quizzes?categorySlug=javascript&difficulty=MEDIUM&sort=popular&limit=10
```

------------------------------------------------------------------------

## Сценарий: получить вопросы конкретного квиза

Использовать:

``` text
GET /api/v1/questions?quiz_id=QUIZ_ID&include_answers=true
```

Если нужны ответы --- явно передать:

``` text
include_answers=true
```

------------------------------------------------------------------------

## Сценарий: найти случайные вопросы

Использовать browse mode:

``` text
GET /api/v1/questions?category=Programming&difficulty=MEDIUM&random=true&limit=10
```

В browse mode ответы включаются автоматически.

------------------------------------------------------------------------

## Сценарий: создать квиз

1.  Получить категории:

``` text
GET /api/v1/categories
```

2.  Выбрать `categoryId`.

3.  Создать квиз:

``` text
POST /api/v1/quizzes
```

Минимальное тело:

``` json
{
  "title": "My Quiz",
  "difficulty": "MEDIUM"
}
```

Для taxonomy:

``` json
{
  "title": "Python Decorators",
  "categoryId": "cat_python",
  "difficulty": "HARD",
  "tags": ["python", "decorators"]
}
```

------------------------------------------------------------------------

## Сценарий: добавить много вопросов

Использовать:

``` text
POST /api/v1/quizzes/{id}/questions/batch
```

Ограничение:

``` text
1–50 questions/request
```

Помнить об атомарности batch.

------------------------------------------------------------------------

## Сценарий: реагировать на завершение квиза

Есть два разных механизма:

### Если квиз встроен в браузер

Использовать:

``` text
quizapi:complete
```

### Если нужна серверная интеграция

Использовать webhook:

``` text
quiz.completed
```

Для webhook обязательно проверять HMAC signature.

------------------------------------------------------------------------

# 21. Надёжность и безопасность для агента

Агент должен:

1.  Никогда не хардкодить production API key в исходниках.
2.  Использовать `Authorization: Bearer ...`.
3.  Не логировать API key.
4.  Не отправлять API key пользователю.
5.  При `401` не пытаться бесконечно повторять запрос.
6.  При `429` учитывать `Retry-After`.
7.  При webhook проверять HMAC signature.
8.  Для batch import учитывать атомарность.
9.  Не смешивать API v1 и v2.
10. При неоднозначности сверяться с OpenAPI v1.

------------------------------------------------------------------------

# 22. Минимальный HTTP client

## JavaScript

``` js
const API_BASE = "https://quizapi.io/api/v1";

async function quizApi(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.QUIZAPI_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After") || "60";
    throw new Error(`Rate limited. Retry after ${retryAfter}s`);
  }

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error || `QuizAPI HTTP ${response.status}`);
  }

  return body;
}

// Example
const quizzes = await quizApi(
  "/quizzes?categorySlug=javascript&limit=10"
);

console.log(quizzes.data);
```

------------------------------------------------------------------------

# 23. Минимальный curl reference

## Список квизов

``` bash
curl "https://quizapi.io/api/v1/quizzes?limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Один квиз

``` bash
curl "https://quizapi.io/api/v1/quizzes/QUIZ_ID" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Категории

``` bash
curl "https://quizapi.io/api/v1/categories"
```

## Metadata

``` bash
curl "https://quizapi.io/api/v1/metadata"
```

## Вопросы квиза

``` bash
curl "https://quizapi.io/api/v1/questions?quiz_id=QUIZ_ID&include_answers=true" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Browse questions

``` bash
curl "https://quizapi.io/api/v1/questions?difficulty=MEDIUM&type=MULTIPLE_CHOICE&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Создать квиз

``` bash
curl -X POST "https://quizapi.io/api/v1/quizzes" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "JavaScript Basics",
    "difficulty": "EASY",
    "categoryId": "cat_javascript"
  }'
```

## Batch questions

``` bash
curl -X POST \
  "https://quizapi.io/api/v1/quizzes/QUIZ_ID/questions/batch" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "text": "What does typeof null return?",
        "type": "MULTIPLE_CHOICE",
        "difficulty": "MEDIUM",
        "answers": [
          {
            "text": "object",
            "isCorrect": true
          },
          {
            "text": "null",
            "isCorrect": false
          }
        ]
      }
    ]
  }'
```

------------------------------------------------------------------------

# 24. Decision table для агента

  ---------------------------------------------------------------------------------
  Задача                              Endpoint
  ----------------------------------- ---------------------------------------------
  Узнать доступные                    `GET /api/v1/metadata`
  difficulty/types/categories/tags    

  Получить taxonomy                   `GET /api/v1/categories`

  Найти квизы                         `GET /api/v1/quizzes`

  Получить один квиз                  `GET /api/v1/quizzes/{id}`

  Создать квиз                        `POST /api/v1/quizzes`

  Получить вопросы квиза              `GET /api/v1/questions?quiz_id=...`

  Искать вопросы                      `GET /api/v1/questions`

  Случайно выбрать вопросы            `GET /api/v1/questions?...&random=true`

  Массово добавить вопросы            `POST /api/v1/quizzes/{id}/questions/batch`

  Встроить quiz в web page            Embed Script / iFrame

  Получать server-side events         Webhooks

  Генерировать client                 OpenAPI
  ---------------------------------------------------------------------------------

------------------------------------------------------------------------

# 25. Важные ограничения и caveats

### 1. Не путать `category` и `categoryId`

`category` --- legacy flat category.

`categoryId` --- предпочтительный taxonomy identifier.

### 2. Не путать два режима Questions API

``` text
quiz_id задан
→ вопросы конкретного quiz
```

``` text
quiz_id отсутствует
→ browse/search mode
```

В browse mode `answers` всегда возвращаются.

### 3. `include_answers`

Имеет смысл в режиме конкретного quiz.

``` text
include_answers=true
```

### 4. Batch import атомарный

Одна ошибка validation отменяет весь batch.

### 5. Rate limit

Не рассчитывать на бесконечный throughput.

Общий documented limit:

``` text
60 requests/min/IP
```

Некоторые mutating operations отдельно документированы как:

``` text
20 requests/min
```

### 6. Webhooks

Подпись нужно проверять по raw request body, до JSON parsing.

### 7. API version

Основной documented contract:

``` text
v1
```

Не использовать структуры `/api/v2` из маркетинговой страницы как
источник истины для v1-интеграции.

### 8. Meta различается между режимами Questions API

-   `GET /questions?quiz_id=...` → meta: `{ total, quizId }`
-   `GET /questions` (browse) → meta: `{ total, pageTotal, page, lastPage, limit, offset, links }`

Не полагаться на одинаковую структуру `meta` между этими двумя режимами.

### 9. include_answers по умолчанию false

При запросе `GET /questions?quiz_id=...` ответы **не** включаются
по умолчанию. Нужно явно передать `include_answers=true`.

------------------------------------------------------------------------

# 26. Source of truth

Для автоматизации в первую очередь использовать:

1.  OpenAPI: `https://quizapi.io/api/v1/openapi.json`
2.  API docs: `https://quizapi.io/docs`
3.  Authentication: `https://quizapi.io/docs/authentication`
4.  Quizzes: `https://quizapi.io/docs/quizzes`
5.  Questions: `https://quizapi.io/docs/questions`
6.  Categories: `https://quizapi.io/docs/categories`
7.  Embeds: `https://quizapi.io/docs/embeds`
8.  Webhooks: `https://quizapi.io/docs/webhooks`
9.  Rate Limits: `https://quizapi.io/docs/rate-limits`
10. SDKs: `https://quizapi.io/docs/sdks`

------------------------------------------------------------------------

# 27. Краткая инструкция агенту

При работе с QuizAPI:

``` text
1. Всегда начинать с BASE_URL = https://quizapi.io/api/v1
2. Для discovery использовать metadata/categories без API key.
3. Для приватных API-запросов использовать Authorization: Bearer.
4. Для поиска квизов использовать GET /quizzes.
5. Для поиска вопросов использовать GET /questions.
6. Для конкретного quiz передавать quiz_id.
7. Для создания quiz использовать POST /quizzes.
8. Для массового добавления вопросов использовать POST /quizzes/{id}/questions/batch.
9. Соблюдать enum Difficulty и QuestionType.
10. При 429 читать Retry-After и делать backoff.
11. Webhooks всегда проверять через HMAC-SHA256.
12. Не смешивать v1 и v2.
13. Если документация и пример расходятся, считать OpenAPI v1 и /docs источником истины.
14. `include_answers` по умолчанию `false` — всегда добавлять для quiz_id запросов.
15. Meta отличается между режимами Questions API — не путать.
```

------------------------------------------------------------------------

# 28. Выбор провайдера вопросов и политика ошибок

**Провайдеры** — реестр `PROVIDERS` в `src/shared/api/providers.ts`:

- `quizapi` — quizapi.io, требует `VITE_QUIZAPI_KEY`;
- `trivia` — The Trivia API v2, `https://the-trivia-api.com/v2`,
  бесплатно и без ключа;
- `mock` — встроенные мок-данные (dev/e2e): включается только через
  `VITE_USE_MOCK_DATA=true`; в переключателе настроек опция mock
  появляется лишь пока mock — активный источник (ручного возврата нет,
  при следующей загрузке решает env-флаг).

Активный провайдер — `providerId` в persist-сторе `quiz-provider`
(`src/shared/api/provider-store.ts`, `version: 1`); он входит в ключи
всех quiz-запросов `['quiz', providerId, ...]`, поэтому запросы разных
провайдеров не делят кэш. При `USE_MOCK` merge стора форсирует `mock`
при каждой загрузке страницы. По умолчанию
`DEFAULT_PROVIDER_ID = USE_MOCK ? 'mock' : 'quizapi'`.

Прозрачного авто-фолбэка (раньше `withFallback`) нет — источник
вопросов меняется только явно:

1. **Селектор в `/settings`** («Question source») — `changeProvider(id)`;
   при активной сессии требуется подтверждение (диалог предупреждает о
   сбросе).
2. **Диалог на `/quiz`** (`ApiErrorDialog`) — когда упали вопросы
   сессии: начальный запрос или survival-батч. «Question source
   unavailable»: Retry (повтор того же провайдера) или Change API
   (переключение на `alternateProviderId`). Закрыть диалог нельзя —
   Escape и клики по подложке игнорируются.
3. **Авто-смена на `/setup`** — если metadata/категории упали
   broken-ошибкой (см. ниже), приложение само переключается на другого
   провайдера и показывает тост «Question source changed».

Любая смена провайдера делает одно и то же
(`src/features/provider/use-change-provider.ts`): `setProviderId` →
`removeQueries(['quiz'])` → `reset()` сессии → навигация на `/setup`.

**Политика ошибок.** Все ошибки API типизированы (`QuizApiError.kind`,
`src/shared/api/errors.ts`):

| kind | Смысл | Реакция |
| --- | --- | --- |
| `network` | обрыв сети пользователя | ретраи того же провайдера (до 2); на `/setup` — inline-alert с Retry, провайдер **не** меняется |
| `timeout` | провайдер завис дольше 10 с (HAR-подтверждено) | провайдер сломан: на `/quiz` — диалог Retry/Change API; на `/setup` — авто-смена + тост, без авто-retry |
| `auth`, `rate_limit`, `parse`, `http` | провайдер сломан | на `/quiz` — диалог Retry/Change API; на `/setup` — авто-смена + тост |

Ретраи: `retryQuestions` — только network до 2 повторов; timeout и
остальные kind падают сразу (fail fast — смена провайдера без ожидания
2×10 с). metadata/категории используют дефолт React Query (2
повтора). Все live-запросы обоих провайдеров ограничены
`AbortSignal.timeout(10_000)`.

**The Trivia API v2 — справка** (`src/shared/api/triviaapi.ts`):

Эндпоинты:
`GET /questions?limit=&offset=&difficulties=&categories=&types=`,
`GET /questions/count?<те же фильтры>` (точный размер пула — аналог
`meta.total`), `GET /metadata`, `GET /categories` (плоский record
`displayName` → slug-и, 10 категорий).

Параметры: `limit` клампится на 50; `difficulties` — одно
lowercase-значение из `config.difficulty`; `types` всегда `text_choice`
(`text_input` без ключа даёт 401); `categories` отправляется только при
успешном маппинге слага — неизвестный слаг API молча подменяет на
`general_knowledge`. `offset` v2 сейчас игнорирует (параметр шлём на
будущее), исчерпание пула детектируется на клиенте: `addQuestionBatch`
дедуплицирует по `id`, `added === 0` → `questionsExhausted`
(`src/shared/lib/session-store.ts`).

Маппинг категорий — `resolveTriviaCategory` в
`src/shared/api/triviaapi.ts`: science/history/geography-листы →
`science`/`history`/`geography`, literature и art-and-architecture →
`arts_and_literature`, movies/tv-shows/anime → `film_and_tv`, music →
`music`, sports → `sport_and_leisure`, food-and-drink →
`food_and_drink`, mythology → `society_and_culture`, general-knowledge-листы
→ `general_knowledge`; trivia-алиасы (movies, sports, literature, drink,
games…) нормализуются в канон; programming, devops, database,
cybersecurity, math, business и `'all'`/пусто/неизвестное → `null`
(без фильтра — весь пул).

Атрибуция **CC BY-NC 4.0** обязательна — футер показывает её только при
активном trivia (ключи `app.footer_trivia_*` в `src/locales/en.json` и
`ru.json`).

**Код:** клиент — `src/shared/api/triviaapi.ts`, реестр и альтернатива —
`src/shared/api/providers.ts`, стор — `src/shared/api/provider-store.ts`,
zod-схемы — `src/shared/api/schemas.ts`, тесты —
`src/shared/api/triviaapi.test.ts`, `providers.test.ts`,
`provider-store.test.ts`; e2e — `e2e/provider-switch.spec.ts` (фикстуры
внешних ответов — `e2e/api-fixtures.ts`).
