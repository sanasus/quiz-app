/**
 * Backend client — the only place a live provider touches the network.
 *
 * Both live providers talk to our own proxy (server/), so the browser
 * never sees an upstream URL or the QuizAPI key: the key lives in the
 * server's `QUIZAPI_KEY` env, and `/api` is same-origin (vite proxies
 * it to :3000 in dev).
 *
 *   GET /api/quiz/questions?provider=&category=&difficulty=&limit=&offset=
 *   GET /api/quiz/catalog?provider=
 *
 * Failure mapping — the client half of the provider-switch contract
 * (docs/providers.md, wire envelope in docs/proxy-server.md). The
 * rule: *only the server's typed envelope decides a switch.*
 *
 *   fetch rejected        → classifyError → network (retry) / timeout (switch)
 *   proxy answered !ok
 *     with envelope       → throw it verbatim: the server already knew
 *                           the real cause and rewrote the status
 *     without envelope    → network (retry) — a non-envelope failure is
 *                           our own server misbehaving (validation bug,
 *                           restart, vite proxy answering instead of
 *                           it), and switching provider cannot fix
 *                           something both providers share
 *   2xx with a broken body → parse (switch candidate)
 */

import { z } from 'zod'
import type { QuizConfig } from '../types/quiz'
import { classifyError, QuizApiError } from './errors'
import type { ApiProviderId } from './errors'
import { getInitialFetchLimit } from './fetch-limits'
import type { QuestionsFetchOptions, QuestionsPage } from './providers'
import {
  catalogSchema,
  errorEnvelopeSchema,
  questionsPageSchema,
} from './backend.schemas'
import type { ErrorEnvelope } from './backend.schemas'

/** Same-origin proxy; dev traffic goes through the vite /api proxy. */
const API_BASE = '/api/quiz'

/**
 * Abort deadline for the proxy itself. The server cuts its own upstream
 * off at 10s and answers 504, so this only has to outlast that — long
 * enough to never race the server's own timeout, short enough that a
 * hung server still cannot stall the app.
 */
const REQUEST_TIMEOUT_MS = 15_000

/** Query-string builder — keeps param names in one place. */
function requestUrl(
  path: 'questions' | 'catalog',
  params: Record<string, string | number>,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value))
  }
  return `${API_BASE}/${path}?${search.toString()}`
}

/** Fetch the proxy and return the raw JSON payload, or throw typed. */
async function requestJson(
  url: string,
  providerId: ApiProviderId,
): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    // The proxy is unreachable — server not running, offline. A
    // connectivity problem on our side → network → retry, never a switch.
    throw classifyError(error, providerId)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    if (!response.ok) {
      throw serverFailure(response.status, providerId, error)
    }
    // 2xx whose body is not JSON: classifyError maps the SyntaxError
    // to parse (the contract is broken, not the connection).
    throw classifyError(error, providerId)
  }

  if (!response.ok) {
    const envelope = errorEnvelopeSchema.safeParse(payload)
    if (envelope.success) throw fromEnvelope(envelope.data.error)
    throw serverFailure(response.status, providerId)
  }

  return payload
}

/**
 * A non-2xx without the typed envelope is our server's problem, not a
 * provider's — reported as network so the policy retries instead of
 * auto-switching into an identically broken server.
 */
function serverFailure(
  status: number,
  providerId: ApiProviderId,
  cause?: unknown,
): QuizApiError {
  return new QuizApiError(`Unexpected response from server: HTTP ${status}`, {
    kind: 'network',
    providerId,
    status,
    cause,
  })
}

/** Rehydrate the envelope into the error the policy layer expects. */
function fromEnvelope(envelope: ErrorEnvelope['error']): QuizApiError {
  return new QuizApiError(envelope.message, {
    kind: envelope.kind,
    providerId: envelope.providerId,
    status: envelope.status,
  })
}

/**
 * Turn a validated payload into the requested shape. A contract break
 * here is `parse` — a provider-switch candidate, not something a retry
 * could fix.
 */
function parseOrThrow<T>(
  payload: unknown,
  schema: z.ZodType<T>,
  providerId: ApiProviderId,
  what: string,
): T {
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new QuizApiError(
      `Invalid ${what} response: ${parsed.error.message}`,
      { kind: 'parse', providerId, cause: parsed.error },
    )
  }
  return parsed.data
}

/**
 * One page of questions. `limit`/`offset` are computed by the caller
 * (survival batches arrive with an explicit offset), defaulting to the
 * same initial limit the mock uses.
 */
export async function fetchBackendQuestions(
  providerId: ApiProviderId,
  config: QuizConfig,
  options: QuestionsFetchOptions = {},
): Promise<QuestionsPage> {
  const payload = await requestJson(
    requestUrl('questions', {
      provider: providerId,
      category: config.category,
      difficulty: config.difficulty,
      limit: options.limit ?? getInitialFetchLimit(config),
      offset: options.offset ?? 0,
    }),
    providerId,
  )

  return parseOrThrow(
    payload,
    questionsPageSchema,
    providerId,
    'questions',
  ) satisfies QuestionsPage
}

/** Merged metadata + categories for the setup screen — one request. */
export async function fetchBackendCatalog(
  providerId: ApiProviderId,
): Promise<z.infer<typeof catalogSchema>> {
  const payload = await requestJson(
    requestUrl('catalog', { provider: providerId }),
    providerId,
  )

  return parseOrThrow(payload, catalogSchema, providerId, 'catalog')
}
