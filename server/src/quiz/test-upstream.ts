/**
 * Minimal local upstream for supertest-driven integration tests.
 *
 * The providers talk real `fetch`, so stubbing fetch would test the
 * stub instead of the wiring. A throwaway localhost HTTP server lets
 * every branch be exercised for real: status codes, headers (Retry-
 * After), malformed bodies and a hang for the timeout path.
 *
 * Test-only — excluded from the production build by the `test-` glob
 * in tsconfig.build.json.
 */

import http from 'node:http'
import type { AddressInfo } from 'node:net'

export interface CapturedRequest {
  method: string
  /** Path + query, e.g. `/quizapi/questions?limit=10`. */
  url: string
  headers: http.IncomingHttpHeaders
}

export type UpstreamHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  captured: CapturedRequest,
) => void

export interface TestUpstream {
  /** Origin both providers can be pointed at (`http://127.0.0.1:<port>`). */
  origin: string
  /** Every request received so far, in arrival order. */
  requests: CapturedRequest[]
  close(): Promise<void>
}

export function startUpstream(handler: UpstreamHandler): Promise<TestUpstream> {
  const requests: CapturedRequest[] = []
  const sockets = new Set<import('node:net').Socket>()

  const server = http.createServer((req, res) => {
    const captured: CapturedRequest = {
      method: req.method ?? 'GET',
      url: req.url ?? '/',
      headers: req.headers,
    }
    requests.push(captured)
    // A throwing handler must not take the server down: answer 500 so
    // the failure surfaces as a visible response instead of a hang.
    try {
      handler(req, res, captured)
    } catch (error) {
      console.error('test upstream handler threw:', error)
      if (!res.headersSent) {
        res.statusCode = 500
        res.end('{}')
      }
    }
  })

  // Tracked so close() can force sockets shut: a handler that answers
  // by *hanging* (the timeout branch) would otherwise block
  // server.close() forever waiting for the open connection.
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })

  return new Promise<TestUpstream>((resolve, reject) => {
    server.once('error', reject)
    // Port 0 → any free port; 127.0.0.1 keeps it loopback-only.
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolve({
        origin: `http://127.0.0.1:${port}`,
        requests,
        close: () =>
          new Promise<void>((done, fail) => {
            for (const socket of sockets) socket.destroy()
            server.close((error) => (error ? fail(error) : done()))
          }),
      })
    })
  })
}

/** Send a JSON body with an explicit status and optional extra headers. */
export function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...headers,
  })
  res.end(JSON.stringify(body))
}

/**
 * Build a handler that answers the next queued response (FIFO) and
 * falls back to 500 once the queue is empty — an unqueued request is a
 * bug in the test, and a 500 makes it fail loudly rather than silently.
 */
export function scripted(
  responses: ReadonlyArray<
    | {
        kind: 'json'
        status?: number
        body: unknown
        headers?: Record<string, string>
      }
    | { kind: 'hang' }
    | { kind: 'text'; status?: number; body: string }
  >,
): UpstreamHandler {
  let index = 0
  return (_req, res) => {
    const step = responses[Math.min(index, responses.length - 1)]
    index += 1
    if (!step) {
      res.writeHead(500)
      res.end('{}')
      return
    }
    if (step.kind === 'hang') {
      // Intentionally never respond — the provider's abort must fire.
      return
    }
    if (step.kind === 'text') {
      res.writeHead(step.status ?? 200, { 'Content-Type': 'text/plain' })
      res.end(step.body)
      return
    }
    sendJson(res, step.status ?? 200, step.body, step.headers)
  }
}
