/**
 * Typed upstream errors (errors.ts).
 *
 * The provider-switch policy keys off `kind`, so a wrong classification
 * (e.g. auth reported as network) silently changes how the client reacts
 * to a broken provider. These tests pin the mapping.
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  UpstreamError,
  classifyUpstream,
  httpStatusKind,
  parseRetryAfter,
  upstreamHttpError,
} from './errors'

describe('UpstreamError', () => {
  it('keeps the message and exposes kind, status, retryAfter and cause', () => {
    const cause = new Error('inner failure')
    const error = new UpstreamError('rate_limit', 'Too many requests', {
      status: 429,
      retryAfter: 60,
      cause,
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('UpstreamError')
    expect(error.message).toBe('Too many requests')
    expect(error.kind).toBe('rate_limit')
    expect(error.status).toBe(429)
    expect(error.retryAfter).toBe(60)
    expect(error.cause).toBe(cause)
  })

  it('leaves status and retryAfter undefined when there was no HTTP response', () => {
    const error = new UpstreamError('network', 'Failed to fetch')

    expect(error.status).toBeUndefined()
    expect(error.retryAfter).toBeUndefined()
  })
})

describe('classifyUpstream', () => {
  it('returns an existing UpstreamError unchanged (same object)', () => {
    const original = new UpstreamError('auth', 'Invalid key', { status: 401 })

    expect(classifyUpstream(original)).toBe(original)
  })

  it('classifies the TimeoutError DOMException from AbortSignal.timeout', () => {
    const timeout = new DOMException('The operation timed out', 'TimeoutError')
    const error = classifyUpstream(timeout)

    expect(error.kind).toBe('timeout')
    expect(error.message).toBe('The operation timed out')
    expect(error.cause).toBe(timeout)
  })

  it('classifies AbortError as timeout too', () => {
    const abort = new DOMException('This operation was aborted', 'AbortError')
    expect(classifyUpstream(abort).kind).toBe('timeout')
  })

  it('classifies fetch TypeErrors as network', () => {
    for (const message of ['Failed to fetch', 'fetch failed']) {
      const error = classifyUpstream(new TypeError(message))
      expect(error.kind).toBe('network')
      expect(error.message).toBe(message)
    }
  })

  it('classifies a TypeError wrapping a TimeoutError cause as timeout', () => {
    // undici may wrap the abort reason instead of throwing it directly.
    const wrapped = new TypeError('fetch failed')
    wrapped.cause = new DOMException('The operation timed out', 'TimeoutError')

    expect(classifyUpstream(wrapped).kind).toBe('timeout')
  })

  it('keeps a TypeError with an unrelated cause as network', () => {
    const wrapped = new TypeError('fetch failed')
    wrapped.cause = new Error('inner failure')

    expect(classifyUpstream(wrapped).kind).toBe('network')
  })

  it('classifies a real ZodError as parse', () => {
    const schema = z.object({ id: z.string() })
    let zodError: unknown
    try {
      schema.parse({ id: 42 })
    } catch (caught) {
      zodError = caught
    }
    expect(zodError).toBeInstanceOf(Error)

    const error = classifyUpstream(zodError)
    expect(error.kind).toBe('parse')
    expect(error.cause).toBe(zodError)
  })

  it('classifies a ZodError-shaped error by name', () => {
    const fake = new Error('schema broken')
    fake.name = 'ZodError'

    expect(classifyUpstream(fake).kind).toBe('parse')
  })

  it('classifies a JSON decode SyntaxError as parse, not network', () => {
    // response.json() on a non-JSON body — the upstream answered, it
    // just was not JSON. Reported as network would make the client
    // retry a provider that will keep answering garbage.
    const broken = new SyntaxError('Unexpected token < in JSON at position 0')

    const error = classifyUpstream(broken)
    expect(error.kind).toBe('parse')
    expect(error.cause).toBe(broken)
  })

  it('falls back to network for unknown errors', () => {
    const unknown = new Error('something odd')
    const error = classifyUpstream(unknown)

    expect(error.kind).toBe('network')
    expect(error.message).toBe('something odd')
    expect(error.cause).toBe(unknown)
  })

  it('falls back to network for non-Error rejections', () => {
    expect(classifyUpstream('plain string rejection').kind).toBe('network')
  })
})

describe('httpStatusKind', () => {
  it('maps auth statuses, rate limits and everything else', () => {
    expect(httpStatusKind(401)).toBe('auth')
    expect(httpStatusKind(403)).toBe('auth')
    expect(httpStatusKind(429)).toBe('rate_limit')
    expect(httpStatusKind(500)).toBe('http')
    expect(httpStatusKind(404)).toBe('http')
  })
})

describe('upstreamHttpError', () => {
  /** A response as the providers receive it (status + Retry-After only). */
  function upstreamResponse(
    status: number,
    headers: Record<string, string> = {},
  ) {
    return new Response('{}', { status, headers })
  }

  it('maps the status to a kind and keeps it as `status`', () => {
    expect(upstreamHttpError('QuizAPI', upstreamResponse(401))).toMatchObject({
      kind: 'auth',
      status: 401,
      retryAfter: undefined,
    })
    expect(upstreamHttpError('QuizAPI', upstreamResponse(500))).toMatchObject({
      kind: 'http',
      status: 500,
    })
  })

  it('tells a rate-limited user when to come back', () => {
    // The message is shown verbatim in the error dialog, so it must not
    // be a bare "HTTP 429": the caller already knows Retry-After.
    const error = upstreamHttpError(
      'QuizAPI',
      upstreamResponse(429, { 'Retry-After': '90' }),
    )

    expect(error.kind).toBe('rate_limit')
    expect(error.retryAfter).toBe(90)
    expect(error.message).toBe('Rate limit exceeded. Try again in 90s.')
  })

  it('reports a rate limit without a Retry-After without a countdown', () => {
    const error = upstreamHttpError('The Trivia API', upstreamResponse(429))

    expect(error.kind).toBe('rate_limit')
    expect(error.retryAfter).toBeUndefined()
    expect(error.message).toBe('Rate limit exceeded.')
  })

  it('names the failing endpoint in the generic message', () => {
    expect(
      upstreamHttpError('QuizAPI metadata', upstreamResponse(503)).message,
    ).toBe('QuizAPI metadata error: HTTP 503')
  })
})

describe('parseRetryAfter', () => {
  it('parses a delta-seconds header', () => {
    expect(parseRetryAfter('60')).toBe(60)
    expect(parseRetryAfter('0')).toBe(0)
  })

  it('returns undefined for absent and non-numeric headers', () => {
    expect(parseRetryAfter(null)).toBeUndefined()
    // HTTP-date form — a hint we choose not to resolve.
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT')).toBeUndefined()
    expect(parseRetryAfter('soon')).toBeUndefined()
  })

  it('rejects negative values', () => {
    expect(parseRetryAfter('-5')).toBeUndefined()
  })
})
