/**
 * Response envelope schemas — `meta.total` drives the survival header
 * ("Question 1/68"), so its parsing must be tolerant but honest.
 */

import { describe, expect, it } from 'vitest'
import { quizApiMetaSchema } from './schemas'

describe('quizApiMetaSchema', () => {
  it('reads the pool total', () => {
    const parsed = quizApiMetaSchema.parse({
      total: 68,
      pageTotal: 7,
      page: 1,
      lastPage: 7,
      limit: 10,
      offset: 0,
      links: { next: '/api/v1/questions?limit=10&offset=10' },
    })

    expect(parsed.total).toBe(68)
    expect(parsed.links?.next).toBe('/api/v1/questions?limit=10&offset=10')
  })

  it('tolerates an empty or total-less envelope', () => {
    expect(quizApiMetaSchema.parse({}).total).toBeUndefined()
  })

  it('rejects a malformed total instead of guessing', () => {
    expect(quizApiMetaSchema.safeParse({ total: 'many' }).success).toBe(false)
  })
})
