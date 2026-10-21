/**
 * Share card — pure data model.
 *
 * Turns a finished session into the already-translated strings and
 * numbers the canvas renderer draws, so the per-mode layout decision
 * (answer grid vs. survival summary) is testable without a canvas.
 */

import type { TFunction } from 'i18next'
import type { SessionResult } from '../../shared/types/quiz'
import { formatCategorySlug } from '../stats/stats-logic'

export const SURVIVAL_MAX_LIVES = 3

export type ShareCardBody =
  | { kind: 'grid'; outcomes: boolean[] }
  | {
      kind: 'survival'
      passed: string
      passedLabel: string
      lives: number
      maxLives: number
    }

export interface ShareCardTile {
  label: string
  value: string
  icon?: 'flame'
}

export interface ShareCardData {
  dateLabel: string
  /** mode · difficulty · category */
  pills: string[]
  scoreLabel: string
  score: string
  recordLabel?: string
  body: ShareCardBody
  tiles: ShareCardTile[]
  domain: string
  cta: string
}

export interface ShareCardExtras {
  level: number
  isNewRecord: boolean
  domain: string
}

export function categoryLabel(slug: string, t: TFunction): string {
  return slug === 'all' ? t('common.all_categories') : formatCategorySlug(slug)
}

/** One-line summary used as the share text: «Blitz · Hard · 9/10 · 1,240 points». */
export function buildShareText(
  result: SessionResult,
  t: TFunction,
  locale: string,
): string {
  const points = t('share.points', {
    count: result.score,
    formatted: new Intl.NumberFormat(locale).format(result.score),
  })
  return [
    t(`setup.${result.mode}`),
    t(`setup.${result.difficulty}`),
    `${result.correctCount}/${result.totalQuestions}`,
    points,
  ].join(' · ')
}

export function buildShareCardData(
  result: SessionResult,
  extras: ShareCardExtras,
  t: TFunction,
  locale: string,
): ShareCardData {
  const number = new Intl.NumberFormat(locale)

  const body: ShareCardBody =
    result.mode === 'survival'
      ? {
          kind: 'survival',
          passed: number.format(result.correctCount),
          passedLabel: t('share.survival_passed', {
            count: result.correctCount,
          }),
          lives: Math.max(0, Math.min(SURVIVAL_MAX_LIVES, result.livesLeft)),
          maxLives: SURVIVAL_MAX_LIVES,
        }
      : { kind: 'grid', outcomes: result.outcomes }

  return {
    dateLabel: new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
      result.finishedAt,
    ),
    pills: [
      t(`setup.${result.mode}`),
      t(`setup.${result.difficulty}`),
      categoryLabel(result.category, t),
    ],
    scoreLabel: t('results.score'),
    score: number.format(result.score),
    recordLabel: extras.isNewRecord ? t('share.new_record') : undefined,
    body,
    tiles: [
      {
        label: t('results.correct'),
        value: `${number.format(result.correctCount)}/${number.format(result.totalQuestions)}`,
      },
      {
        label: t('share.streak'),
        value: number.format(result.bestStreak),
        icon: 'flame',
      },
      { label: t('share.level'), value: number.format(extras.level) },
    ],
    domain: extras.domain,
    cta: t('share.cta'),
  }
}
