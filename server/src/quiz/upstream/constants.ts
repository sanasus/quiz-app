/**
 * Shared upstream constants.
 */

/** Every upstream request aborts after 10s — a hung API must not stall the proxy. */
export const REQUEST_TIMEOUT_MS = 10_000

export const QUIZAPI_BASE_URL = 'https://quizapi.io/api/v1'

export const TRIVIA_BASE_URL = 'https://the-trivia-api.com/v2'

/** The trivia API rejects `limit` above 50. */
export const TRIVIA_MAX_LIMIT = 50

/**
 * Always requested from trivia: the keyless `text_input` type returns
 * 401, so only `text_choice` works without an API key.
 */
export const TRIVIA_QUESTION_TYPE = 'text_choice'
