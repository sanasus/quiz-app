/**
 * Binds the pure quiz assembly (load-quiz.ts) to the live pieces: the
 * provider registry, the IndexedDB history and the pool cursors.
 */

import { QuizApiError } from '../../shared/api/errors'
import { getInitialFetchLimit } from '../../shared/api/fetch-limits'
import { getProvider, type ProviderId } from '../../shared/api/providers'
import { useQuizSessionStore } from '../../shared/lib/session-store'
import type { QuizConfig } from '../../shared/types/quiz'
import { cursorKey, useCursorStore } from './cursor-store'
import { getHistory } from './history-db'
import {
  loadCursorBatch,
  loadCursorQuiz,
  loadRandomBatch,
  loadRandomQuiz,
  type LoadedBatch,
  type LoadedQuiz,
} from './load-quiz'

function sources(providerId: ProviderId, config: QuizConfig) {
  const provider = getProvider(providerId)
  return {
    provider,
    common: {
      fetchPage: (options: { limit: number; offset: number }) =>
        provider.fetchQuestions(config, options),
      readHistory: (ids: string[]) => getHistory(providerId, ids),
      // The mock stays in pool order so e2e runs are deterministic.
      shuffle: providerId !== 'mock',
    },
  }
}

/** The questions a new run starts with. */
export async function loadQuiz(
  providerId: ProviderId,
  config: QuizConfig,
): Promise<LoadedQuiz> {
  const { provider, common } = sources(providerId, config)
  const count = getInitialFetchLimit(config)

  const loaded =
    provider.paging === 'cursor'
      ? await loadCursorQuiz({
          ...common,
          count,
          startOffset:
            useCursorStore.getState().cursors[
              cursorKey(providerId, config.category, config.difficulty)
            ] ?? 0,
        })
      : await loadRandomQuiz({ ...common, count })

  // Every candidate reported or filtered away: surface it like an empty
  // upstream (a provider-switch candidate), not as a quiz of zero.
  if (loaded.questions.length === 0 && providerId !== 'mock') {
    throw new QuizApiError('No questions available. Try different settings.', {
      kind: 'parse',
      providerId,
    })
  }
  return loaded
}

/** The next survival batch; reads the live run from the session store. */
export async function loadBatch(
  providerId: ProviderId,
  config: QuizConfig,
  limit: number,
): Promise<LoadedBatch> {
  const { provider, common } = sources(providerId, config)
  const session = useQuizSessionStore.getState()
  const exclude = new Set(session.questions.map((q) => q.id))

  return provider.paging === 'cursor'
    ? loadCursorBatch({
        ...common,
        limit,
        exclude,
        poolStart: session.poolStart,
        poolConsumed: session.poolConsumed,
        total: session.questionsTotal,
      })
    : loadRandomBatch({ ...common, limit, exclude })
}
