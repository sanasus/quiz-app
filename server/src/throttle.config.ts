/**
 * Throttle budget for the proxy — one module so AppModule and the
 * throttling test cannot drift apart on the numbers.
 *
 * Deliberately below QuizAPI's own 60 req/min/IP, so a burst is capped
 * by us before it reaches their counter and burns the shared key — and
 * loose enough for a real session: a survival batch is one request per
 * 10 questions, the setup screen two, and the client's network retries
 * add at most two more per failure.
 */

/** Default window. */
export const THROTTLE_DEFAULT_TTL_MS = 60_000

/** Default per-IP budget within that window. */
export const THROTTLE_DEFAULT_LIMIT = 30

/**
 * Read from env at module definition (once per process) so a deploy can
 * tune the budget without a rebuild; tests that need a different budget
 * set the env before importing AppModule.
 */
export function throttleOptions(env: NodeJS.ProcessEnv = process.env) {
  const ttl = Number(env.THROTTLE_TTL_MS)
  const limit = Number(env.THROTTLE_LIMIT)
  return {
    throttlers: [
      {
        ttl: Number.isFinite(ttl) && ttl > 0 ? ttl : THROTTLE_DEFAULT_TTL_MS,
        limit:
          Number.isFinite(limit) && limit > 0 ? limit : THROTTLE_DEFAULT_LIMIT,
      },
    ],
  }
}
