/**
 * Mode registry — all game modes mapped by their id.
 */

import type { QuizMode } from '../../shared/types/quiz'
import { ClassicMode } from './classic'
import { TimedMode } from './timed'
import { BlitzMode } from './blitz'
import { SurvivalMode } from './survival'
import type { GameMode } from './mode'

export const MODE_REGISTRY: Record<QuizMode, GameMode> = {
  classic: ClassicMode,
  timed: TimedMode,
  blitz: BlitzMode,
  survival: SurvivalMode,
}

/**
 * Get a mode by its id. Throws if the mode is unknown.
 */
export function getMode(mode: QuizMode): GameMode {
  const m = MODE_REGISTRY[mode]
  if (!m) {
    throw new Error(`Unknown game mode: ${mode}`)
  }
  return m
}

/** All mode ids, for iteration / UI rendering. */
export const MODE_IDS: QuizMode[] = ['classic', 'timed', 'blitz', 'survival']
