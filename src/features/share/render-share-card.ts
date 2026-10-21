/**
 * Share card renderer — hand-drawn on Canvas 2D (no DOM-to-image
 * libraries: they stumble on fonts, CSS variables and Safari).
 *
 * Colors come from the app's CSS tokens at render time, so the card
 * follows the current light/dark theme without a second palette.
 */

import type { ShareCardData } from './share-card-data'
import {
  CARD_HEIGHT,
  CARD_PADDING,
  CARD_WIDTH,
  layoutGrid,
} from './share-card-layout'

export interface SharePalette {
  bg: string
  bg2: string
  border: string
  text: string
  text2: string
  text3: string
  primary: string
  onPrimary: string
  success: string
  onSuccess: string
  danger: string
  onDanger: string
  warning: string
  onWarning: string
  streak: string
}

const TOKENS: Record<keyof SharePalette, string> = {
  bg: '--color-bg',
  bg2: '--color-bg-2',
  border: '--color-border',
  text: '--color-text',
  text2: '--color-text-2',
  text3: '--color-text-3',
  primary: '--color-primary',
  onPrimary: '--color-on-primary',
  success: '--color-success',
  onSuccess: '--color-on-success',
  danger: '--color-danger',
  onDanger: '--color-on-danger',
  warning: '--color-warning',
  onWarning: '--color-on-warning',
  streak: '--color-streak',
}

export function readPalette(root: HTMLElement): SharePalette {
  const style = getComputedStyle(root)
  const entries = Object.entries(TOKENS).map(([key, token]) => [
    key,
    style.getPropertyValue(token).trim(),
  ])
  return Object.fromEntries(entries) as unknown as SharePalette
}

// lucide-react 24×24 icon paths (stroke 2, round caps).
const ICONS = {
  flame:
    'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4',
  heart:
    'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
} as const

const FONT = '"Inter Variable", system-ui, sans-serif'
const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`

const CONTENT_WIDTH = CARD_WIDTH - CARD_PADDING * 2

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: keyof typeof ICONS,
  x: number,
  y: number,
  size: number,
  opts: { stroke: string; fill?: string; strokeWidth?: number },
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.lineWidth = opts.strokeWidth ?? 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const path = new Path2D(ICONS[name])
  if (opts.fill) {
    ctx.fillStyle = opts.fill
    ctx.fill(path)
  }
  ctx.strokeStyle = opts.stroke
  ctx.stroke(path)
  ctx.restore()
}

/** Shorten `text` with an ellipsis until it fits `maxWidth`. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let end = text.length
  while (
    end > 1 &&
    ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth
  ) {
    end--
  }
  return `${text.slice(0, end)}…`
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  p: SharePalette,
) {
  const y = CARD_PADDING
  // Logo: rounded primary tile with a "Q".
  ctx.fillStyle = p.primary
  roundRect(ctx, CARD_PADDING, y, 64, 64, 18)
  ctx.fill()
  ctx.fillStyle = p.onPrimary
  ctx.font = font(800, 40)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Q', CARD_PADDING + 32, y + 34)

  ctx.fillStyle = p.text
  ctx.font = font(800, 38)
  ctx.textAlign = 'left'
  ctx.fillText('QuizApp', CARD_PADDING + 84, y + 34)

  ctx.fillStyle = p.text3
  ctx.font = font(500, 28)
  ctx.textAlign = 'right'
  ctx.fillText(data.dateLabel, CARD_WIDTH - CARD_PADDING, y + 34)
}

function drawPills(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  p: SharePalette,
  y: number,
) {
  const height = 56
  const gap = 16
  const padX = 28
  ctx.font = font(600, 26)
  const maxText = CONTENT_WIDTH / 2
  const labels = data.pills.map((pill) => fit(ctx, pill, maxText))
  const widths = labels.map((l) => ctx.measureText(l).width + padX * 2)
  const total = widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1)

  let x = (CARD_WIDTH - total) / 2
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  labels.forEach((label, i) => {
    ctx.fillStyle = p.bg2
    roundRect(ctx, x, y, widths[i], height, height / 2)
    ctx.fill()
    ctx.strokeStyle = p.border
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = p.text2
    ctx.fillText(label, x + padX, y + height / 2 + 1)
    x += widths[i] + gap
  })
}

function drawScore(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  p: SharePalette,
  top: number,
) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = p.text2
  ctx.font = font(600, 32)
  ctx.fillText(data.scoreLabel, CARD_WIDTH / 2, top + 32)

  ctx.fillStyle = p.primary
  ctx.font = font(800, 200)
  ctx.fillText(data.score, CARD_WIDTH / 2, top + 230, CONTENT_WIDTH)

  if (data.recordLabel) {
    ctx.font = font(700, 26)
    const w = ctx.measureText(data.recordLabel).width + 56
    const x = (CARD_WIDTH - w) / 2
    ctx.fillStyle = p.warning
    roundRect(ctx, x, top + 260, w, 50, 25)
    ctx.fill()
    ctx.fillStyle = p.onWarning
    ctx.textBaseline = 'middle'
    ctx.fillText(data.recordLabel, CARD_WIDTH / 2, top + 286)
  }
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  p: SharePalette,
  top: number,
  height: number,
) {
  const { body } = data

  if (body.kind === 'grid') {
    const g = layoutGrid(body.outcomes.length, CONTENT_WIDTH, height)
    const x0 = (CARD_WIDTH - g.width) / 2
    const y0 = top + (height - g.height) / 2
    body.outcomes.forEach((ok, i) => {
      const x = x0 + (i % g.cols) * (g.cell + g.gap)
      const y = y0 + Math.floor(i / g.cols) * (g.cell + g.gap)
      ctx.fillStyle = ok ? p.success : p.danger
      roundRect(ctx, x, y, g.cell, g.cell, g.cell * 0.22)
      ctx.fill()
      // A glyph on top, so the result is not carried by color alone.
      const icon = g.cell * 0.55
      drawIcon(
        ctx,
        ok ? 'check' : 'x',
        x + (g.cell - icon) / 2,
        y + (g.cell - icon) / 2,
        icon,
        { stroke: ok ? p.onSuccess : p.onDanger, strokeWidth: 2.5 },
      )
    })
    return
  }

  // Survival: passed-question count and the lives left.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = p.text
  ctx.font = font(800, 150)
  ctx.fillText(body.passed, CARD_WIDTH / 2, top + 150, CONTENT_WIDTH)
  ctx.fillStyle = p.text2
  ctx.font = font(600, 34)
  ctx.fillText(body.passedLabel, CARD_WIDTH / 2, top + 210, CONTENT_WIDTH)

  const heart = 84
  const gap = 28
  const total = body.maxLives * heart + (body.maxLives - 1) * gap
  const x0 = (CARD_WIDTH - total) / 2
  for (let i = 0; i < body.maxLives; i++) {
    const alive = i < body.lives
    drawIcon(ctx, 'heart', x0 + i * (heart + gap), top + 250, heart, {
      stroke: alive ? p.danger : p.text3,
      fill: alive ? p.danger : undefined,
    })
  }
}

function drawTiles(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  p: SharePalette,
  top: number,
) {
  const gap = 24
  const height = 150
  const w = (CONTENT_WIDTH - gap * (data.tiles.length - 1)) / data.tiles.length
  data.tiles.forEach((tile, i) => {
    const x = CARD_PADDING + i * (w + gap)
    ctx.fillStyle = p.bg2
    roundRect(ctx, x, top, w, height, 28)
    ctx.fill()
    ctx.strokeStyle = p.border
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'center'
    ctx.fillStyle = p.text3
    ctx.font = font(600, 24)
    ctx.fillText(tile.label, x + w / 2, top + 48, w - 24)

    ctx.font = font(800, 60)
    ctx.fillStyle = p.text
    const iconSize = tile.icon ? 48 : 0
    const iconGap = iconSize ? 10 : 0
    const groupW = ctx.measureText(tile.value).width + iconSize + iconGap
    const startX = x + (w - groupW) / 2
    if (tile.icon) {
      drawIcon(ctx, tile.icon, startX, top + 72, iconSize, {
        stroke: p.streak,
        fill: p.streak,
      })
    }
    ctx.textAlign = 'left'
    ctx.fillText(tile.value, startX + iconSize + iconGap, top + 122)
  })
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  p: SharePalette,
) {
  const y = CARD_HEIGHT - CARD_PADDING - 12
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = p.text2
  ctx.font = font(600, 30)
  ctx.textAlign = 'left'
  ctx.fillText(data.domain, CARD_PADDING, y, CONTENT_WIDTH / 2)
  ctx.fillStyle = p.primary
  ctx.font = font(800, 38)
  ctx.textAlign = 'right'
  ctx.fillText(data.cta, CARD_WIDTH - CARD_PADDING, y, CONTENT_WIDTH / 2)
}

function drawBackground(ctx: CanvasRenderingContext2D, p: SharePalette) {
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  // Soft primary aura, echoing the app background.
  const aura = ctx.createRadialGradient(100, 0, 0, 100, 0, 900)
  aura.addColorStop(0, `${p.primary}40`)
  aura.addColorStop(1, `${p.primary}00`)
  ctx.fillStyle = aura
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
}

/** Wait for the faces the card uses; a missing font degrades to system-ui. */
async function loadFonts() {
  if (typeof document === 'undefined' || !document.fonts) return
  await Promise.allSettled(
    [500, 600, 700, 800].map((w) =>
      document.fonts.load(`${w} 48px "Inter Variable"`),
    ),
  )
}

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  await loadFonts()
  // Read tokens only after the await: a theme switch applied in the same
  // commit has landed in the DOM by now.
  const palette = readPalette(document.documentElement)

  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available')

  drawBackground(ctx, palette)
  drawHeader(ctx, data, palette)
  drawPills(ctx, data, palette, 200)
  drawScore(ctx, data, palette, 300)
  drawBody(ctx, data, palette, 660, 360)
  drawTiles(ctx, data, palette, 1050)
  drawFooter(ctx, data, palette)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Canvas export failed')),
      'image/png',
    )
  })
}
