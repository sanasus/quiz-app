// Stub components for all 7 routes defined in PLAN.md §5
import { z } from 'zod'

export const quizConfigSchema = z.object({
  category: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionCount: z.coerce.number().min(1).max(50),
  mode: z.enum(['classic', 'timed', 'blitz', 'survival']),
})

export type QuizConfigInput = z.infer<typeof quizConfigSchema>
export function HomeStub() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      <h1 className="text-4xl font-bold text-primary">🏠 Home</h1>
      <p className="text-text-2">
        Главная страница: старт, последние результаты, уровень
      </p>
    </div>
  )
}

export function SetupStub() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      <h1 className="text-4xl font-bold text-primary">⚙️ Setup</h1>
      <p className="text-text-2">
        Настройки теста: категория, сложность, количество, режим
      </p>
    </div>
  )
}

export function QuizStub() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      <h1 className="text-4xl font-bold text-primary">🎮 Quiz</h1>
      <p className="text-text-2">
        Прохождение теста: вопросы, варианты, таймер
      </p>
    </div>
  )
}

export function ResultsStub() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      <h1 className="text-4xl font-bold text-success">🏆 Results</h1>
      <p className="text-text-2">
        Результаты: очки, правильные/неправильные, повтор ошибок
      </p>
    </div>
  )
}

export function StatsStub() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      <h1 className="text-4xl font-bold text-info">📊 Stats</h1>
      <p className="text-text-2">
        Статистика: сессии, точность, серии, графики
      </p>
    </div>
  )
}

export function AchievementsStub() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      <h1 className="text-4xl font-bold text-warning">🏅 Achievements</h1>
      <p className="text-text-2">Достижения: витрина, разблокировки, XP</p>
    </div>
  )
}

export function SettingsStub() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      <h1 className="text-4xl font-bold text-text">⚙️ Settings</h1>
      <p className="text-text-2">Настройки: язык, тема, анимации</p>
    </div>
  )
}
