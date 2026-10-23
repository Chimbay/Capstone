export type Rect = { x: number; y: number; width: number; height: number }

// A card's rect: its measured size, else the size it was saved with.
export const rectOf = (n: {
  position: { x: number; y: number }
  measured?: { width?: number; height?: number }
  width?: number
  height?: number
}): Rect => ({
  ...n.position,
  width: n.measured?.width ?? n.width ?? 0,
  height: n.measured?.height ?? n.height ?? 0
})

type XY = { x: number; y: number }

// A card in a frame stores its position relative to the frame (frames don't nest); these convert to and from the canvas position.
export const toAbsolute = (p: XY, parent?: XY) => ({
  x: p.x + (parent?.x ?? 0),
  y: p.y + (parent?.y ?? 0)
})
export const toRelative = (p: XY, parent?: XY) => ({
  x: p.x - (parent?.x ?? 0),
  y: p.y - (parent?.y ?? 0)
})

// A card's rect on the canvas, wherever it is stored relative to.
export const absRect = (
  n: Parameters<typeof rectOf>[0] & { parentId?: string },
  nodes: readonly { id: string; position: XY }[]
): Rect => ({
  ...rectOf(n),
  ...toAbsolute(n.position, nodes.find(p => p.id === n.parentId)?.position)
})

// The smallest rect holding all of `rects`, grown by `pad` on every side.
export function boundsOf(rects: Rect[], pad: number): Rect {
  const x = Math.min(...rects.map(r => r.x)) - pad
  const y = Math.min(...rects.map(r => r.y)) - pad
  const right = Math.max(...rects.map(r => r.x + r.width)) + pad
  const bottom = Math.max(...rects.map(r => r.y + r.height)) + pad
  return { x, y, width: right - x, height: bottom - y }
}

// The frame a card at `rect` belongs in: by its center, so a card half over a border still counts.
// It stays in frame `current` while its center is inside, else it goes to the smallest frame it's over.
export function frameAt<F extends Rect & { id: string }>(
  rect: Rect,
  frames: F[],
  current?: string
) {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const over = frames.filter(
    f => cx >= f.x && cx <= f.x + f.width && cy >= f.y && cy <= f.y + f.height
  )
  return (
    over.find(f => f.id === current) ??
    over.sort((a, b) => a.width * a.height - b.width * b.height)[0]
  )
}

// The side of `target` that faces `source`, along the axis with the larger center offset (ties go horizontal).
export function facingSide(source: Rect, target: Rect) {
  const dx = target.x + target.width / 2 - (source.x + source.width / 2)
  const dy = target.y + target.height / 2 - (source.y + source.height / 2)
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'left' : 'right'
  return dy > 0 ? 'top' : 'bottom'
}

// The middle of `side` of `rect`: where that side's handle sits.
export function sidePoint(rect: Rect, side: ReturnType<typeof facingSide>) {
  const x = { left: 0, right: 1, top: 0.5, bottom: 0.5 }[side]
  const y = { top: 0, bottom: 1, left: 0.5, right: 0.5 }[side]
  return { x: rect.x + rect.width * x, y: rect.y + rect.height * y }
}

// The handles that point a connector's two ends at each other.
export function orientEdge(source: Rect, target: Rect) {
  return {
    sourceHandle: facingSide(target, source),
    targetHandle: facingSide(source, target)
  }
}

type SplitEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: string
  data: { text: string }
  markerEnd?: unknown
}

// Splits connector A→B at `card` into A→card (keeps the id, label and data) and card→B (new id, empty label).
// Both halves take only the saved fields plus the arrow, so live-store state like `selected` isn't copied.
export function splitEdge(
  edge: SplitEdge,
  a: Rect,
  b: Rect,
  card: Rect & { id: string },
  newId: string
): [SplitEdge, SplitEdge] {
  const { id, source, target, sourceHandle, targetHandle, type, data, markerEnd } = edge
  const saved = {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type,
    data,
    ...(markerEnd !== undefined && { markerEnd })
  }
  return [
    { ...saved, target: card.id, targetHandle: facingSide(a, card) },
    {
      ...saved,
      id: newId,
      source: card.id,
      sourceHandle: facingSide(b, card),
      data: { ...data, text: '' }
    }
  ]
}

type Guide = { x1: number; y1: number; x2: number; y2: number }

// Snaps `dragged` so one of its left/center/right lines meets the nearest such line on another
// card within `threshold`, and the same for top/middle/bottom. Returns the shift and a guide per
// snapped axis, spanning from the farthest edge of one card to the farthest edge of the other.
export function alignTo(dragged: Rect, others: Rect[], threshold: number) {
  const lines = (start: number, size: number) => [start, start + size / 2, start + size]
  const nearest = (axis: 'x' | 'y', size: 'width' | 'height') => {
    let hit: { d: number; at: number; other: Rect } | undefined
    for (const other of others)
      for (const a of lines(dragged[axis], dragged[size]))
        for (const b of lines(other[axis], other[size]))
          if (Math.abs(b - a) <= threshold && (!hit || Math.abs(b - a) < Math.abs(hit.d)))
            hit = { d: b - a, at: b, other }
    return hit
  }
  const v = nearest('x', 'width')
  const h = nearest('y', 'height')
  const r = { ...dragged, x: dragged.x + (v?.d ?? 0), y: dragged.y + (h?.d ?? 0) }
  const guides: Guide[] = []
  if (v) {
    const { at, other: o } = v
    guides.push({
      x1: at,
      y1: Math.min(r.y, o.y),
      x2: at,
      y2: Math.max(r.y + r.height, o.y + o.height)
    })
  }
  if (h) {
    const { at, other: o } = h
    guides.push({
      x1: Math.min(r.x, o.x),
      y1: at,
      x2: Math.max(r.x + r.width, o.x + o.width),
      y2: at
    })
  }
  return { dx: v?.d ?? 0, dy: h?.d ?? 0, guides }
}

// The section of a `count`-way wheel that the offset (dx, dy) from its center points into, or null
// within `minR` or beyond `maxR`. Section 0 is centered on straight up, then clockwise (screen y grows down).
export function ringSection(
  dx: number,
  dy: number,
  count: number,
  minR: number,
  maxR: number
) {
  const r = Math.hypot(dx, dy)
  if (r < minR || r > maxR) return null
  const turn = Math.atan2(dx, -dy) / (2 * Math.PI)
  return ((Math.round(turn * count) % count) + count) % count
}
