/**
 * /quiz — Quiz screen with timer, answer flow, and results.
 */

import { useEffect, useRef } from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuizQuestions } from '../shared/api/quizapi'
import { useQuizSessionStore } from '../shared/lib/session-store'
import { calculateScore } from '../shared/lib/scoring'
import { quizConfigSchema } from './-index'

export const QuizScreen = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as Record<string, string>

  // Parse and validate config from search params
  const configResult = quizConfigSchema.safeParse(search)
  const config = configResult.success ? configResult.data : null

  const store = useQuizSessionStore()
  const questionStartTime = useRef<number>(0)

  // Start timer when quiz begins
  useEffect(() => {
    if (store.status !== 'playing') return
    questionStartTime.current = Date.now()
  }, [store.status, store.currentIndex])

  // Load questions when config is valid
  const { data: questions, error } = useQuizQuestions(config)

  useEffect(() => {
    if (questions && config && store.status === 'idle') {
      store.loadQuestions(questions, config)
      store.startPlaying()
    }
  }, [questions, config, store.status, store])

  // Handle session end (all questions answered)
  useEffect(() => {
    if (store.status === 'finished' && !store.finishedSession) {
      const correctCount = store.questions.filter((q) => {
        const selected = store.answers[q.id] ?? []
        return (
          q.correctOptionIds.length === selected.length &&
          q.correctOptionIds.every((id) => selected.includes(id))
        )
      }).length

      // Calculate total score from all answers
      let totalScore = 0
      for (let i = 0; i < store.questions.length; i++) {
        const q = store.questions[i]
        const selected = store.answers[q.id] ?? []
        const isCorrect =
          q.correctOptionIds.length === selected.length &&
          q.correctOptionIds.every((id) => selected.includes(id))
        if (isCorrect) {
          totalScore += calculateScore(
            q.difficulty,
            Math.floor((Date.now() - questionStartTime.current) / 1000),
            i < store.streak ? store.streak : 0,
          )
        }
      }

      store.finishSession(totalScore, Math.floor((Date.now() - questionStartTime.current) / 1000), correctCount)
      navigate({ to: '/results' })
    }
  }, [store.status, store.finishedSession, store.questions, store.answers, store.streak, navigate])

  // Current question
  const currentQuestion = store.questions[store.currentIndex]

  if (!config) {
    navigate({ to: '/setup' })
    return null
  }

  if (store.status === 'idle' || store.status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg text-text-2">{t('common.loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-lg text-danger">{error.message}</p>
        <button
          type="button"
          onClick={() => navigate({ to: '/setup' })}
          className="rounded-lg bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary/90"
        >
          {t('common.back')}
        </button>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-text-2">{t('common.loading')}</p>
      </div>
    )
  }

  const selected = store.answers[currentQuestion.id] ?? []
  const isAnswered = selected.length > 0

  const handleOptionClick = (optionId: string) => {
    store.selectOption(optionId)
  }

  const handleSubmit = () => {
    store.submitAnswer()
  }

  const handleNext = () => {
    store.nextQuestion()
  }

  // Calculate score for current question
  const currentScore = store.score
  const streak = store.streak

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header bar */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-text-2">
          {t('quiz.progress', {
            current: store.currentIndex + 1,
            total: store.questions.length,
          })}
        </span>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-primary">
            {t('quiz.score', { score: currentScore })}
          </span>
          {streak > 0 && (
            <span className="text-warning">🔥 {streak}</span>
          )}
          {store.mode === 'survival' && (
            <span className="text-danger">
              {'❤️'.repeat(store.lives)}{'🖤'.repeat(3 - store.lives)}
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="mb-6 rounded-xl bg-surface p-6 shadow-md">
        <h2 className="mb-2 text-xl font-bold text-text">
          {currentQuestion.text}
        </h2>
        {currentQuestion.description && (
          <p className="text-text-2">{currentQuestion.description}</p>
        )}
      </div>

      {/* Options */}
      <div className="mb-6 flex flex-col gap-3">
        {currentQuestion.options.map((option, idx) => {
          const isSelected = selected.includes(option.id)
          const letter = String.fromCharCode(65 + idx) // A, B, C, ...

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleOptionClick(option.id)}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all
                ${
                  isSelected
                    ? 'border-primary bg-primary/10 font-semibold text-primary shadow-sm'
                    : 'border-border bg-surface text-text hover:border-border/60 hover:bg-muted'
                }`}
              aria-pressed={isSelected}
            >
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-muted text-text-3'
                }`}
              >
                {letter}
              </span>
              <span>{option.text}</span>
            </button>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {isAnswered && !store.questions[store.currentIndex + 1] && (
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
          >
            {t('quiz.submit')}
          </button>
        )}
        {isAnswered && store.questions[store.currentIndex + 1] && (
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
          >
            {t('quiz.submit')}
          </button>
        )}
        {store.status === 'answered' && (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
          >
            {t('quiz.next')}
          </button>
        )}
      </div>

      {/* Explanation */}
      {store.status === 'answered' && currentQuestion.explanation && (
        <div className="mt-4 rounded-xl bg-muted p-4 text-sm text-text-2">
          <strong>{t('quiz.explanation')}:</strong> {currentQuestion.explanation}
        </div>
      )}
    </div>
  )
}

export const Route = createFileRoute('/quiz')({
  component: QuizScreen,
})
