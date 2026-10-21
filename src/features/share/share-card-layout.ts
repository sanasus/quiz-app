/**
 * Share card — geometry. Pure, so the answer-grid fitting is unit-tested
 * without a canvas.
 */

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350
export const CARD_PADDING = 80

export interface GridLayout {
  cols: number
  rows: number
  cell: number
  gap: number
  /** Total size of the laid-out grid (for centering). */
  width: number
  height: number
}

const MAX_COLS = 10
const MAX_CELL = 72
const MIN_CELL = 12
const GAP = 12

/**
 * Fit `count` square cells into `width` × `height`: at most 10 columns
 * (one row for a 10-question quiz); more columns are added only when the
 * rows would not fit vertically (long quizzes).
 */
export function layoutGrid(
  count: number,
  width: number,
  height: number,
): GridLayout {
  const n = Math.max(1, count)
  let cols = Math.min(n, MAX_COLS)

  for (;;) {
    const cell = Math.min(MAX_CELL, (width - GAP * (cols - 1)) / cols)
    const rows = Math.ceil(n / cols)
    const fitsHeight = rows * cell + (rows - 1) * GAP <= height
    if ((fitsHeight && cell >= MIN_CELL) || cols >= n) {
      const size = Math.max(MIN_CELL, Math.floor(cell))
      return {
        cols,
        rows,
        cell: size,
        gap: GAP,
        width: cols * size + (cols - 1) * GAP,
        height: rows * size + (rows - 1) * GAP,
      }
    }
    cols++
  }
}
