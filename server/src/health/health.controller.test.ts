import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../app.module'
import { createTestApp } from '../test-app'

describe('HealthController (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = await createTestApp(moduleRef)
  })

  afterEach(async () => {
    await app.close()
  })

  it('GET /health responds with status ok', async () => {
    const response = await request(app.getHttpServer()).get('/health')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(typeof response.body.uptime).toBe('number')
  })

  it('keeps /health out of the global api prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(200)
    await request(app.getHttpServer()).get('/api/health').expect(404)
  })
})
