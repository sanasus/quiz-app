/**
 * Typed upstream errors.
 *
 * The coarse `kind` is what the client's provider-switch policy keys off
 * (docs/api-notes.md §28): `network` → retry the same provider;
 * anything else (auth / rate_limit / parse / http / timeout) means the
 * provider is broken and is a candidate for switching. The HTTP
 * exception filter (stage 3) turns these into the wire envelope, so the
 * client never has to re-guess the kind from a bare status code.
 */

import { ZodError } from 'zod'

/** Coarse failure category used by the provider-switch policy. */
export type UpstreamErrorKind =
  'auth' | 'rate_limit' | 'parse' | 'http' | 'network' | 'timeout'

export interface UpstreamErrorOptions {
  /** HTTP status of the failed upstream response, when there was one. */
  status?: number
  /** Parsed Retry-After (seconds) — forwarded on rate limits. */
  retryAfter?: number
  cause?: unknown
}

export class UpstreamError extends Error {
  readonly kind: UpstreamErrorKind
  readonly status?: number
  readonly retryAfter?: number

  constructor(
    kind: UpstreamErrorKind,
    message: string,
    options: UpstreamErrorOptions = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'UpstreamError'
    this.kind = kind
    this.status = options.status
    this.retryAfter = options.retryAfter
  }
}

/** Map an HTTP status onto the coarse kind. */
export function httpStatusKind(status: number): UpstreamErrorKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limit'
  return 'http'
}

/**
 * Turn a non-2xx upstream response into a typed error: kind from the
 * status, `Retry-After` parsed and carried along.
 *
 * The message is user-facing — the client shows it verbatim in the
 * error dialog — so a rate limit says when to come back instead of
 * exposing a bare status. Every provider throws through this one
 * helper, so all six upstream calls word their failures the same way.
 */
export function upstreamHttpError(
  label: string,
  response: Pick<Response, 'status' | 'headers'>,
): UpstreamError {
  const retryAfter = parseRetryAfter(response.headers.get('Retry-After'))
  return new UpstreamError(
    httpStatusKind(response.status),
    upstreamMessage(label, response.status, retryAfter),
    { status: response.status, retryAfter },
  )
}

/** User-facing message for an upstream that answered non-2xx. */
function upstreamMessage(
  label: string,
  status: number,
  retryAfter: number | undefined,
): string {
  if (status === 429 && retryAfter !== undefined) {
    return `Rate limit exceeded. Try again in ${retryAfter}s.`
  }
  if (status === 429) return 'Rate limit exceeded.'
  return `${label} error: HTTP ${status}`
}

/**
 * Parse a Retry-After header (delta-seconds) into a number. Non-numeric
 * forms (HTTP-date) and absent headers yield undefined rather than
 * throwing — the header is a hint, never a hard requirement.
 */
export function parseRetryAfter(header: string | null): number | undefined {
  if (header === null) return undefined
  const seconds = Number(header)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined
}

/**
 * Wrap any thrown fetch/parse exception into an UpstreamError. Already
 * typed errors pass through unchanged, so wrapping is idempotent.
 *
 * Mirrors the client's classifyError (src/shared/api/errors.ts): a hung
 * upstream (TimeoutError) is the provider's fault, while a rejected
 * fetch (TypeError) counts as a network failure.
 */
export function classifyUpstream(error: unknown): UpstreamError {
  if (error instanceof UpstreamError) return error

  const name = errorName(error)
  // Undici may wrap the abort reason rather than throw it directly, so
  // a cut-off upstream can arrive as a TypeError/Error whose *cause*
  // carries the abort name. Inspected for any outer type, not just
  // TypeError, so a timeout is never mistaken for a plain network drop
  // (that would make the client retry a provider that just hangs).
  const causeName = errorName(errorCause(error))

  // AbortSignal.timeout rejects with a DOMException named TimeoutError;
  // explicit aborts surface as AbortError — both mean "cut off".
  if (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    causeName === 'TimeoutError' ||
    causeName === 'AbortError'
  ) {
    return wrap(error, 'timeout')
  }

  // fetch rejects with TypeError on network failures.
  if (error instanceof TypeError) {
    return wrap(error, 'network')
  }

  // Zod schema violation — instanceof alone can miss a duplicate zod
  // copy, so the name is checked as a fallback.
  if (error instanceof ZodError || name === 'ZodError') {
    return wrap(error, 'parse')
  }

  // response.json() on a body that is not JSON throws a SyntaxError.
  // The upstream answered — just not in the shape we asked for — so it
  // must be `parse` (provider broken, switch) rather than `network`
  // (retry the same provider), which would loop on a misbehaving API.
  if (name === 'SyntaxError') {
    return wrap(error, 'parse')
  }

  // Conservative default: unknown rejects count as network → the client
  // retries the same provider instead of switching.
  return wrap(error, 'network')
}

/** `name` of an Error-like value, regardless of realm. */
function errorName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const { name } = error as { name?: unknown }
  return typeof name === 'string' ? name : undefined
}

/** `cause` of an Error-like value, if any. */
function errorCause(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return undefined
  return (error as { cause?: unknown }).cause
}

function wrap(error: unknown, kind: UpstreamErrorKind): UpstreamError {
  return new UpstreamError(kind, errorMessage(error), { cause: error })
}

/** Message of any thrown value. */
function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { message } = error as { message?: unknown }
    if (typeof message === 'string') return message
  }
  return String(error)
}
