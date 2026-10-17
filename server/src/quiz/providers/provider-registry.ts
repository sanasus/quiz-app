/**
 * Provider registry — maps the `provider` query value onto an upstream
 * adapter. The client picks one provider per request; there is no
 * server-side fallback (the explicit client switch stays the single
 * source of truth, see docs/api-notes.md §28).
 *
 * Built once at bootstrap from env config and injected as a singleton.
 */

import { Injectable } from '@nestjs/common'
import type { QuizProvider, UpstreamProviderId } from './provider.interface'
import { QuizApiProvider } from './quizapi.provider'
import { TriviaProvider } from './trivia.provider'

/** The provider ids accepted on the wire. */
export const UPSTREAM_PROVIDER_IDS = ['quizapi', 'trivia'] as const

export function isUpstreamProviderId(
  value: string,
): value is UpstreamProviderId {
  return (UPSTREAM_PROVIDER_IDS as readonly string[]).includes(value)
}

export interface ProviderRegistryOptions {
  /** QuizAPI key — only the quizapi provider needs it. */
  quizApiKey: string | undefined
  /** Overridable base URLs for tests. */
  quizApiBaseUrl?: string
  triviaBaseUrl?: string
  /** Shared upstream abort deadline (defaults per-provider to 10s). */
  upstreamTimeoutMs?: number
}

/** Holds the provider instances and hands them out by id. */
@Injectable()
export class ProviderRegistry {
  private readonly providers: Record<UpstreamProviderId, QuizProvider>

  constructor(options: ProviderRegistryOptions) {
    this.providers = {
      quizapi: new QuizApiProvider({
        apiKey: options.quizApiKey,
        baseUrl: options.quizApiBaseUrl,
        timeoutMs: options.upstreamTimeoutMs,
      }),
      trivia: new TriviaProvider({
        baseUrl: options.triviaBaseUrl,
        timeoutMs: options.upstreamTimeoutMs,
      }),
    }
  }

  get(id: UpstreamProviderId): QuizProvider {
    return this.providers[id]
  }
}
