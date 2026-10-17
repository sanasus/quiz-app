/**
 * Typed API errors (errors.ts): QuizApiError payload and classifyError
 * mapping. The provider-switch policy keys off `kind`, so a wrong
 * classification (e.g. auth reported as network) silently changes how
 * the app reacts to a broken provider.
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { classifyError, QuizApiError } from './errors'

describe('QuizApiError', () => {
  it('keeps the message and exposes kind, providerId, status and cause', () => {
    const cause = new Error('inner failure')
    const error = new QuizApiError('Invalid or expired API key.', {
      kind: 'auth',
      providerId: 'quizapi',
      status: 401,
      cause,
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('QuizApiError')
    expect(error.message).toBe('Invalid or expired API key.')
    expect(error.kind).toBe('auth')
    expect(error.providerId).toBe('quizapi')
    expect(error.status).toBe(401)
    expect(error.cause).toBe(cause)
  })

  it('leaves status undefined when the failure had no HTTP status', () => {
    const error = new QuizApiError('Failed to fetch', {
      kind: 'network',
      providerId: 'trivia',
    })

    expect(error.status).toBeUndefined()
  })
})

describe('classifyError', () => {
  it('returns an existing QuizApiError unchanged (same object)', () => {
    const original = new QuizApiError('Rate limit exceeded.', {
      kind: 'rate_limit',
      providerId: 'quizapi',
      status: 429,
    })

    expect(classifyError(original, 'trivia')).toBe(original)
  })

  it('classifies the TimeoutError DOMException from AbortSignal.timeout', () => {
    const timeout = new DOMException('The operation timed out', 'TimeoutError')
    const error = classifyError(timeout, 'quizapi')

    expect(error.kind).toBe('timeout')
    expect(error.providerId).toBe('quizapi')
    expect(error.message).toBe('The operation timed out')
    expect(error.cause).toBe(timeout)
  })

  it('classifies AbortError as timeout too', () => {
    const abort = new DOMException('This operation was aborted', 'AbortError')
    expect(classifyError(abort, 'trivia').kind).toBe('timeout')
  })

  it('classifies fetch TypeErrors as network', () => {
    for (const message of ['Failed to fetch', 'fetch failed']) {
      const error = classifyError(new TypeError(message), 'quizapi')
      expect(error.kind).toBe('network')
      expect(error.message).toBe(message)
    }
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

    const error = classifyError(zodError, 'trivia')
    expect(error.kind).toBe('parse')
    expect(error.cause).toBe(zodError)
  })

  it('classifies a ZodError-shaped error by name', () => {
    const fake = new Error('schema broken')
    fake.name = 'ZodError'

    expect(classifyError(fake, 'quizapi').kind).toBe('parse')
  })

  it('falls back to network for unknown errors', () => {
    const unknown = new Error('something odd')
    const error = classifyError(unknown, 'trivia')

    expect(error.kind).toBe('network')
    expect(error.message).toBe('something odd')
    expect(error.cause).toBe(unknown)
  })

  it('falls back to network for non-Error rejections', () => {
    const error = classifyError('plain string rejection', 'quizapi')

    expect(error.kind).toBe('network')
    expect(error.message).toBe('plain string rejection')
  })

  it('classifies a SyntaxError (unreadable body) as parse, not network', () => {
    // `response.json()` on a non-JSON body. Reporting it as network
    // would burn retries against an endpoint that answers garbage.
    let syntaxError: unknown
    try {
      JSON.parse('<html>502 Bad Gateway</html>')
    } catch (caught) {
      syntaxError = caught
    }
    expect(syntaxError).toBeInstanceOf(SyntaxError)

    const error = classifyError(syntaxError, 'quizapi')
    expect(error.kind).toBe('parse')
    expect(error.cause).toBe(syntaxError)
  })

  it('classifies a SyntaxError-shaped error by name', () => {
    const fake = new Error('body broken')
    fake.name = 'SyntaxError'

    expect(classifyError(fake, 'trivia').kind).toBe('parse')
  })

  it('stamps the requested providerId on wrapped errors', () => {
    expect(classifyError(new TypeError('x'), 'trivia').providerId).toBe(
      'trivia',
    )
  })
})
