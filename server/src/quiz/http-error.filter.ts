/**
 * Exception filter: UpstreamError → the typed wire envelope.
 *
 *   { "error": { kind, providerId, status, retryAfter, message } }
 *
 * The `kind` is exactly what the client's provider-switch policy keys
 * off (docs/api-notes.md §28), so the client can construct a
 * QuizApiError without re-guessing. The HTTP status is mapped so the
 * client's own status-based heuristics (if any) also stay sane:
 *
 *   auth        → the upstream status (401/403), else 401
 *   rate_limit  → 429 (Retry-After forwarded)
 *   timeout     → 504 (the upstream hung)
 *   network     → 502 (we could not reach the upstream)
 *   parse       → 502 (the upstream answered, but not sensibly)
 *   http        → the upstream status, else 502
 *
 * Anything that is *not* an UpstreamError is a bug in this server and
 * falls through to Nest's default 500 handling — it must not be
 * dressed up as a provider failure. The same rule applies to an
 * UpstreamError that carries no valid `provider` (see catch below).
 *
 * Bound globally in AppModule via APP_FILTER; nothing else in this
 * file is exported.
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Response } from 'express'
import { UpstreamError } from './errors'
import type { UpstreamErrorKind } from './errors'
import type { UpstreamProviderId } from './providers/provider.interface'
import { isUpstreamProviderId } from './providers/provider-registry'

/** Wire shape of a typed provider failure. */
export interface ErrorEnvelope {
  error: {
    kind: UpstreamErrorKind
    /** The provider the request named — the client narrows this. */
    providerId: UpstreamProviderId
    status?: number
    retryAfter?: number
    message: string
  }
}

/** Map a kind onto the HTTP status the proxy answers with. */
export function envelopeStatus(error: UpstreamError): number {
  switch (error.kind) {
    case 'auth':
      return error.status ?? HttpStatus.UNAUTHORIZED
    case 'rate_limit':
      return 429
    case 'timeout':
      return HttpStatus.GATEWAY_TIMEOUT
    case 'http':
      return error.status ?? HttpStatus.BAD_GATEWAY
    // We could not reach the upstream, or it answered garbage: from the
    // client's perspective both are "the upstream failed", not the
    // client's request.
    case 'network':
    case 'parse':
      return HttpStatus.BAD_GATEWAY
  }
}

@Catch(UpstreamError)
export class UpstreamErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(UpstreamErrorFilter.name)

  catch(exception: UpstreamError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<{ query?: Record<string, unknown> }>()

    const status = envelopeStatus(exception)
    const providerId = readProviderId(request.query)

    // The envelope's contract is "the provider you asked for failed",
    // and the client narrows providerId to a known id. Without one the
    // contract cannot be honoured, so this is our own wiring being
    // wrong — answer like a bug, never dressed up as a provider failure
    // (that would make the client switch providers off a bookkeeping
    // mistake). Unreachable: the zod pipe rejects an unknown provider
    // with a 400 before any upstream call can be made.
    if (!providerId) {
      this.logger.error(
        `upstream ${exception.kind} with no valid provider query param: ${exception.message}`,
      )
      response
        .status(500)
        .json({ statusCode: 500, message: 'Internal server error' })
      return
    }

    const body: ErrorEnvelope = {
      error: {
        kind: exception.kind,
        providerId,
        ...(exception.status !== undefined ? { status: exception.status } : {}),
        ...(exception.retryAfter !== undefined
          ? { retryAfter: exception.retryAfter }
          : {}),
        message: exception.message,
      },
    }

    if (exception.retryAfter !== undefined) {
      response.setHeader('Retry-After', String(exception.retryAfter))
    }

    // 5xx means *our* upstream failed, not the client — log it at warn
    // so a genuinely broken provider is visible in the server output.
    if (status >= 500) {
      this.logger.warn(
        `upstream ${providerId} ${exception.kind}: ${exception.message}`,
      )
    }

    response.status(status).json(body)
  }
}

/**
 * The `provider` query param — the client always sends it, and the zod
 * pipe has already narrowed it to a known id by the time an
 * UpstreamError can be thrown.
 */
function readProviderId(query: unknown): UpstreamProviderId | undefined {
  if (typeof query === 'object' && query !== null) {
    const { provider } = query as { provider?: unknown }
    if (typeof provider === 'string' && isUpstreamProviderId(provider)) {
      return provider
    }
  }
  return undefined
}
