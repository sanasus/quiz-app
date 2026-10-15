/**
 * Typed API errors shared by every quiz provider client.
 *
 * Every failure surfaced from a fetch function is a QuizApiError with a
 * coarse `kind` — the provider-switch policy
 * (docs/provider-switch-plan.md) keys off it: network → retry the same
 * provider; timeout (the provider hung) and anything else (auth,
 * rate_limit, parse, http) mean the provider is broken and is a
 * candidate for switching.
 */

import { ZodError } from 'zod'

/** Coarse failure category used by the provider-switch policy. */
export type ErrorKind =
  'auth' | 'rate_limit' | 'parse' | 'http' | 'network' | 'timeout'

/** Only the two live providers — the mock never produces API errors. */
export type ApiProviderId = 'quizapi' | 'trivia'

export class QuizApiError extends Error {
  readonly kind: ErrorKind
  readonly providerId: ApiProviderId
  /** HTTP status of the failed response, when the failure had one. */
  readonly status?: number

  constructor(
    message: string,
    options: {
      kind: ErrorKind
      providerId: ApiProviderId
      status?: number
      cause?: unknown
    },
  ) {
    super(message, { cause: options.cause })
    this.name = 'QuizApiError'
    this.kind = options.kind
    this.providerId = options.providerId
    this.status = options.status
  }
}

/** Map an HTTP status onto the typed error kind. */
export function httpErrorKind(status: number): ErrorKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limit'
  return 'http'
}

/**
 * Wrap any thrown fetch/parse exception into a QuizApiError. Already
 * typed errors pass through unchanged, so wrapping is idempotent.
 */
export function classifyError(
  error: unknown,
  providerId: ApiProviderId,
): QuizApiError {
  if (error instanceof QuizApiError) return error

  const name = errorName(error)

  // AbortSignal.timeout(REQUEST_TIMEOUT_MS) rejects with a DOMException
  // named TimeoutError; explicit aborts surface as AbortError — both
  // mean "the request was cut off", not "the provider is broken".
  // Matched by name (not instanceof): a DOMException from another
  // realm (jsdom tests) is not an instance of this realm's Error.
  if (name === 'TimeoutError' || name === 'AbortError') {
    return wrap(error, 'timeout', providerId)
  }

  // fetch rejects with TypeError on network failures ("Failed to
  // fetch", "fetch failed") and on CORS/mixed-content blocks.
  if (error instanceof TypeError) {
    return wrap(error, 'network', providerId)
  }

  // Zod schema violation — instanceof alone would miss a duplicate
  // zod copy, so the name is checked as a fallback.
  if (error instanceof ZodError || name === 'ZodError') {
    return wrap(error, 'parse', providerId)
  }

  // Conservative default: unknown fetch rejects count as network, so
  // the user gets a retry of the same provider, not a provider switch.
  return wrap(error, 'network', providerId)
}

/** `name` of an Error-like value, regardless of its realm. */
function errorName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const { name } = error as { name?: unknown }
  return typeof name === 'string' ? name : undefined
}

function wrap(
  error: unknown,
  kind: ErrorKind,
  providerId: ApiProviderId,
): QuizApiError {
  const message = errorMessage(error)
  return new QuizApiError(message, { kind, providerId, cause: error })
}

/** Message of any thrown value (fetch rejects with non-Errors too). */
function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { message } = error as { message?: unknown }
    if (typeof message === 'string') return message
  }
  return String(error)
}
