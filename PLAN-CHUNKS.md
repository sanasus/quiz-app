# PLAN-CHUNKS.md — разбивка плана на части для модели с 60k контекста

Каждый чанк — самодостаточная задача: содержит цель, входные данные, выход, критерии готовности и правила.
Модель с 60k контекста должна брать **один чанк за раз**, читать только файлы, указанные в «Вход», и не трогать чужие файлы.

Общие правила (действуют для всех чанков):
- После каждого чанка: `typecheck`, `lint`, `test` — всё зелёное, отдельный коммит.
- Бизнес-логика (очки, XP, автомат сессии, достижения) — чистые функции без React.
- Секреты не коммитить. `.env` в `.gitignore`.
- Не добавлять зависимости вне списка из PLAN.md §2.
- Следовать документации, фиксировать в `docs/api-notes.md`.

---

## Чанк 0. Каркас проекта (PLAN.md §12 Этап 0)

**Цель:** рабочий каркас Vite + React 19 + TS strict, роутер, i18n, тема, структура папок.

**Вход:** PLAN.md §2 (стек), §4 (структура), §5 (маршруты), §11 (i18n).

**Действия:**
1. `npm create vite@latest` (react-ts), `strict: true`.
2. Установить: TanStack Router, TanStack Query, Zustand, Tailwind v4, Motion, Zod, i18next, react-i18next, Vitest, Testing Library, ESLint, Prettier.
3. Создать структуру `src/` по PLAN.md §4.
4. Настроить Tailwind v4: токены цветов, радиусов, теней, отступов; светлая/тёмная темы.
5. Настроить i18next: `ru.json`, `en.json`, автоопределение, переключатель.
6. Настроить TanStack Router: 7 маршрутов из §5 (заглушки-компоненты).
7. `.env.example` с `VITE_QUIZAPI_KEY`, `.env` в `.gitignore`.
8. `docs/api-notes.md` — изучение документации QuizAPI: эндпоинты, параметры, структура ответа, лимиты.

**Выход:** `npm run dev` стартует, все 7 маршрутов рендерят заглушки, переключатель RU/EN работает, темы переключаются.

**Готово когда:** typecheck/lint/test зелёные; `docs/api-notes.md` заполнен реальными данными из документации.

---

## Чанк 1. Слой данных: API-клиент + Zod + адаптер (PLAN.md §12 Этап 1)

**Цель:** модуль `shared/api/quizapi.ts` с клиентом, Zod-схемами, адаптером, хуками Query.

**Вход:** PLAN.md §3 (работа с API), `docs/api-notes.md` (из чанка 0).

**Действия:**
1. Zod-схемы для ответов QuizAPI (вопросы, категории, ошибки).
2. Адаптер: ответ API → внутренняя модель `Question` (PLAN.md §3).
3. Отбрасывать невалидные вопросы (нет текста, нет правильного ответа, <2 вариантов).
4. Обработка: загрузка, ошибка сети, 401/403, 429, пустая выборка.
5. Хуки TanStack Query: `useQuizQuestions`, `useCategories`.
6. Тесты адаптера на фикстурах: одиночный выбор, множественный, битые данные.

**Выход:** `src/shared/api/quizapi.ts`, `src/shared/api/schemas.ts`, `src/shared/api/adapter.ts`, хуки, тесты.

**Готово когда:** тесты адаптера проходят; клиент инкапсулирован (базовый URL меняется в одном месте).

### Пример ответа QuizAPI (реальный формат)

```json
{
  "id": 1,
  "question": "How to select all p elements inside a div element?",
  "description": null,
  "answers": {
    "answer_a": "div p",
    "answer_b": "div p.all",
    "answer_c": "div-p",
    "answer_d": "div > p"
  },
  "multiple_correct_answers": "false",
  "correct_answers": {
    "answer_a_correct": "true",
    "answer_b_correct": "false",
    "answer_c_correct": "false",
    "answer_d_correct": "false"
  },
  "explanation": "The correct way is div p...",
  "tip": null,
  "tags": [{"name": "HTML"}],
  "category": "Code",
  "difficulty": "Easy"
}
```

**Ключевые особенности формата (не угадывать, проверять по `docs/api-notes.md`):**

| Поле API | Тип | Примечание |
|---|---|---|
| `id` | `number` | Числовой, не строковый |
| `question` | `string` | Текст вопроса |
| `description` | `string \| null` | Может быть `null` |
| `answers` | `Record<string, string>` | Ключи: `answer_a`, `answer_b`, … (до 6 вариантов) |
| `multiple_correct_answers` | `string` (`"true"` / `"false"`) | **Строка**, не boolean |
| `correct_answers` | `Record<string, string>` | Ключи: `answer_a_correct`, …; значения `"true"` / `"false"` |
| `explanation` | `string \| null` | |
| `tip` | `string \| null` | |
| `tags` | `{ name: string }[]` | |
| `category` | `string` | |
| `difficulty` | `string` (`"Easy"` / `"Medium"` / `"Hard"`) | **С заглавной**, не lowercase |

**Zod-схема (пример):**

```ts
import { z } from 'zod';

const answerKey = z.enum(['answer_a', 'answer_b', 'answer_c', 'answer_d', 'answer_e', 'answer_f']);
const correctKey = z.enum(['answer_a_correct', 'answer_b_correct', 'answer_c_correct', 'answer_d_correct', 'answer_e_correct', 'answer_f_correct']);

export const quizApiQuestionSchema = z.object({
  id: z.number(),
  question: z.string().min(1),
  description: z.string().nullable(),
  answers: z.record(answerKey, z.string()),
  multiple_correct_answers: z.enum(['true', 'false']),
  correct_answers: z.record(correctKey, z.enum(['true', 'false'])),
  explanation: z.string().nullable(),
  tip: z.string().nullable(),
  tags: z.array(z.object({ name: z.string() })),
  category: z.string(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
});

export type QuizApiQuestion = z.infer<typeof quizApiQuestionSchema>;
```

**Адаптер (пример):**

```ts
import type { QuizApiQuestion } from './schemas';
import type { Question } from '../types';

export function adaptQuestion(raw: QuizApiQuestion): Question | null {
  // Собираем варианты из answers
  const options: { id: string; text: string }[] = [];
  const correctOptionIds: string[] = [];

  for (const [key, text] of Object.entries(raw.answers)) {
    const optionId = key; // "answer_a" и т.д.
    options.push({ id: optionId, text });

    const correctKey = `${key}_correct`;
    if (raw.correct_answers[correctKey] === 'true') {
      correctOptionIds.push(optionId);
    }
  }

  // Валидация: минимум 2 варианта, минимум 1 правильный
  if (options.length < 2 || correctOptionIds.length === 0) {
    return null;
  }

  const multiple = raw.multiple_correct_answers === 'true';

  return {
    id: String(raw.id),
    text: raw.question,
    description: raw.description ?? undefined,
    explanation: raw.explanation ?? undefined,
    options,
    correctOptionIds,
    multiple,
    category: raw.category,
    difficulty: raw.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
  };
}
```

**Тестовые фикстуры (минимум):**

```ts
// 1. Одиночный выбор (как в примере выше)
const singleFixture: QuizApiQuestion = { /* ...пример из JSON выше... */ };

// 2. Множественный выбор
const multipleFixture: QuizApiQuestion = {
  ...singleFixture,
  id: 2,
  question: "Select all that apply",
  multiple_correct_answers: 'true',
  correct_answers: {
    answer_a_correct: 'true',
    answer_b_correct: 'true',
    answer_c_correct: 'false',
    answer_d_correct: 'false',
  },
};

// 3. Битые данные: нет правильного ответа
const brokenFixture: QuizApiQuestion = {
  ...singleFixture,
  id: 3,
  correct_answers: {
    answer_a_correct: 'false',
    answer_b_correct: 'false',
    answer_c_correct: 'false',
    answer_d_correct: 'false',
  },
};

// 4. Битые данные: только 1 вариант
const oneOptionFixture: QuizApiQuestion = {
  ...singleFixture,
  id: 4,
  answers: { answer_a: 'Only option' },
  correct_answers: { answer_a_correct: 'true' },
};
```

---

## Чанк 2. Ядро квиза: сессия + Классика (PLAN.md §12 Этап 2)

**Цель:** экраны `/setup`, `/quiz`, `/results`; стор сессии; режим «Классика»; одиночный и множественный выбор; очки.

**Вход:** PLAN.md §5 (маршруты), §6 (игровая логика), чанк 1 (API-клиент).

**Действия:**
1. Zustand-стор сессии: `idle → loading → playing → (answered) → finished`.
2. Хранить: вопросы, индекс, ответы, время, очки, серия, жизни.
3. Экран `/setup`: выбор категории, сложности, числа вопросов, режима.
4. Экран `/quiz`: рендер вопроса, одиночный выбор (клик), множественный (чекбоксы + «Ответить»).
5. После ответа: показать правильные варианты + `explanation`.
6. Чистая функция подсчёта очков: сложность + бонус за скорость + множитель серии (потолок). Тесты.
7. Экран `/results`: итоги, «повторить ошибки».
8. Защита `/quiz` и `/results`: редирект на `/setup` без сессии.

**Выход:** работающий режим «Классика» на реальных данных QuizAPI.

**Готово когда:** можно пройти сессию «Классика» от `/setup` до `/results`; множественный выбор проверяется по точному совпадению; очки считаются по формуле.

---

## Чанк 3. Остальные режимы (PLAN.md §12 Этап 3)

**Цель:** режимы «На время», «Блиц», «Выживание»; повтор ошибок; пауза.

**Вход:** чанк 2 (стор сессии, экраны), PLAN.md §6 (режимы).

**Действия:**
1. «На время»: общий таймер на всю сессию; истечение = завершение.
2. «Блиц»: таймер на каждый вопрос; истечение = неверный ответ, автопереход.
3. «Выживание»: 3 жизни, ошибка = −1 жизнь, 0 = конец; вопросы подгружаются порциями.
4. Повтор ошибок: новая сессия из неверных вопросов завершённой (без нового запроса к API).
5. Пауза: `Esc` вызывает паузу/выход.
6. Тесты чистых функций таймеров и жизней.

**Выход:** все 4 режима работают.

**Готово когда:** каждый режим можно пройти на реальных данных; таймеры корректны; «Выживание» подгружает вопросы порциями.

---

## Чанк 4. Мета-слой: статистика, достижения, XP (PLAN.md §12 Этап 4)

**Цель:** статистика, достижения, XP и уровни, персистентность с миграциями.

**Вход:** PLAN.md §7 (статистика), §8 (достижения), чанк 2 (стор сессии).

**Действия:**
1. Zustand `persist` → localStorage: статистика, достижения, XP. Версионирование + миграция схемы. Zod-валидация при загрузке.
2. Статистика: число сессий, точность, средняя серия, лучший результат, точность по категориям/сложностям, история, график (SVG/CSS).
3. Кнопка сброса статистики с подтверждением.
4. Реестр достижений: `{ id, icon, titleKey, descriptionKey, check(stats, session) }`.
5. Примеры: «Первая кровь», «Серия 10», «Перфекционист», «Скоростной», «Выживший», «Знаток категории», «Постоянство».
6. Проверка достижений — один раз после завершения сессии.
7. XP: чистая функция начисления, формула уровней. Тесты.
8. Разблокировка: тост с анимацией + запись даты в хранилище.
9. Экран `/stats`, `/achievements`.

**Выход:** статистика и достижения сохраняются между перезагрузками.

**Готово когда:** после перезагрузки данные на месте; новые достижения тостятся; XP/уровни считаются по формуле.

---

## Чанк 5. Дизайн и анимации (PLAN.md §12 Этап 5)

**Цель:** финальная стилизация, анимации, темы, конфетти, адаптив, доступность.

**Вход:** PLAN.md §9 (дизайн), §10 (доступность), все экраны из чанков 2–4.

**Действия:**
1. Яркий игровой стиль: палитра, типографика, скругления, «объёмные» кнопки, иконки/эмодзи.
2. Анимации Motion: переходы между вопросами, фидбек правильно/неправильно, шкала таймера + пульсация, счётчик очков/серии, конфетти на `/results`, появление тостов достижений.
3. `prefers-reduced-motion` + настройка отключения анимаций в `/settings`.
4. Mobile-first, адаптив от 360px.
5. Доступность: клавиатура (1–6, Enter, Esc), `aria`-атрибуты, `role="timer"`, `aria-live`, контраст, иконки правильности (не только цветом).
6. Экран `/settings`: язык, тема, анимации.

**Выход:** финальный визуальный слой.

**Готово когда:** все анимации работают; `prefers-reduced-motion` уважается; клавиатурная навигация полная; адаптив от 360px.

---

## Чанк 6. Качество и README (PLAN.md §12 Этап 6)

**Цель:** покрытие тестами, error boundary, пустые/ошибочные состояния, README.

**Вход:** PLAN.md §13 (Definition of Done), все чанки 0–5.

**Действия:**
1. Тесты ключевой логики: очки, режимы, достижения, адаптер (покрытие).
2. Error boundary на уровне приложения.
3. Проверка пустых и ошибочных состояний: нет вопросов, 401/403, 429, сеть.
4. README: запуск, `VITE_QUIZAPI_KEY`, архитектурные решения, ограничения, примечание что вопросы API на английском.
5. Финальный прогон: typecheck, lint, test.

**Выход:** готовое приложение, соответствующее Definition of Done.

**Готово когда:** все пункты §13 PLAN.md выполнены; README описывает запуск и настройку.

---

## Порядок выполнения

```
Чанк 0 → Чанк 1 → Чанк 2 → Чанк 3 → Чанк 4 → Чанк 5 → Чанк 6
```

Каждый чанк зависит от предыдущего. Чанки 0–1 можно делать параллельно (0 — каркас, 1 — слой данных), но 1 требует `docs/api-notes.md` из 0.

## Что модель с 60k контекста должна читать на каждый чанк

| Чанк | Файлы для чтения |
|---|---|
| 0 | PLAN.md §1–5, §11 |
| 1 | PLAN.md §3, `docs/api-notes.md` |
| 2 | PLAN.md §5–6, код чанка 1 |
| 3 | PLAN.md §6, код чанка 2 |
| 4 | PLAN.md §7–8, код чанка 2 |
| 5 | PLAN.md §9–10, код чанков 2–4 |
| 6 | PLAN.md §13, весь код |
