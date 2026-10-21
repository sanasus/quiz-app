import { describe, expect, it } from 'vitest'
import { layoutGrid } from './share-card-layout'

describe('layoutGrid', () => {
  it('puts a 10-question quiz in a single row', () => {
    const g = layoutGrid(10, 920, 360)
    expect(g.cols).toBe(10)
    expect(g.rows).toBe(1)
    expect(g.width).toBeLessThanOrEqual(920)
  })

  it('caps the cell size for short quizzes', () => {
    const g = layoutGrid(3, 920, 360)
    expect(g.cols).toBe(3)
    expect(g.cell).toBe(72)
  })

  it('adds columns for long quizzes so the rows fit the height', () => {
    const g = layoutGrid(60, 920, 360)
    expect(g.cols * g.rows).toBeGreaterThanOrEqual(60)
    expect(g.height).toBeLessThanOrEqual(360)
    expect(g.width).toBeLessThanOrEqual(920)
  })

  it('survives an empty quiz', () => {
    const g = layoutGrid(0, 920, 360)
    expect(g.cols).toBe(1)
  })
})
