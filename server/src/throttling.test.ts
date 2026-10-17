/**
 * Rate limiting — the proxy's own budget, not the provider's.
 *
 * The client's policy switches providers when it sees the typed error
 * envelope (docs/api-notes.md §29). So the throttle must answer
 * with Nest's plain 429 body: wearing the envelope would make the app
 * blame — and switch away from — a perfectly healthy provider because
 * *we* hit a local limit. This file pins that, and the exemption for
 * the liveness probe.
 */

import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from './app.module'
import { createTestApp } from './test-app'
import { THROTTLE_DEFAULT_LIMIT } from './throttle.config'
import {
  sendJson,
  startUpstream,
  type TestUpstream,
} from './quiz/test-upstream'

describe('Throttler (e2e)', () => {
  let app: INestApplication
  let upstream: TestUpstream

  beforeAll(async () => {
    // The budget must be spent on requests that *reach* the handler, so
    // the provider needs somewhere to answer — otherwise every request
    // would be a 502 and prove nothing about counting.
    upstream = await startUpstream((_req, res) => sendJson(res, 200, []))
    process.env.QUIZAPI_BASE_URL = `${upstream.origin}/quizapi`
    process.env.TRIVIA_BASE_URL = `${upstream.origin}/trivia`

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = await createTestApp(moduleRef)
  })

  afterAll(async () => {
    await app.close()
    await upstream.close()
  })

  const questions = () =>
    request(app.getHttpServer())
      .get('/api/quiz/questions')
      .query({ provider: 'trivia', difficulty: 'easy' })

  it('caps a burst without letting the throttle wear the provider envelope', async () => {
    // Burn the whole budget. What each of these answers is irrelevant
    // here (an empty trivia page is a 502) — what matters is that the
    // guard counts them.
    for (let sent = 0; sent < THROTTLE_DEFAULT_LIMIT; sent += 1) {
      await questions()
    }

    const throttled = await questions()

    expect(throttled.status).toBe(429)
    // The discriminator: a provider failure wears the typed envelope,
    // and only that makes the client switch providers. Our own limit
    // must never look like one.
    expect(throttled.body).not.toHaveProperty('error')
    expect(JSON.stringify(throttled.body)).not.toContain('providerId')
  })

  it('keeps the liveness probe out of the budget', async () => {
    // Runs after the test above spent the whole budget: a CI or deploy
    // health loop shares the proxy's IP with the app itself, so a
    // throttled probe would read as an outage.
    await request(app.getHttpServer()).get('/health').expect(200)
  })
})
