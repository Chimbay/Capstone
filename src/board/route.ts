import type { Rect } from './geometry'

type Point = { x: number; y: number }
type Side = 'left' | 'right' | 'top' | 'bottom'

// Directions by index: right, down, left, up. d and (d + 2) % 4 are opposite.
const steps = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1]
]
const outward = { right: 0, bottom: 1, left: 2, top: 3 }

// Collinear and repeated points add nothing to an orthogonal polyline.
const simplify = (pts: Point[]) =>
  pts.filter((p, i) => {
    const a = pts[i - 1]
    const b = pts[i + 1]
    if (!a || !b) return true
    return !((a.x === p.x && p.x === b.x) || (a.y === p.y && p.y === b.y))
  })

const length = (pts: Point[]) =>
  pts
    .slice(1)
    .reduce((sum, p, i) => sum + Math.abs(p.x - pts[i].x) + Math.abs(p.y - pts[i].y), 0)

// Turns along an orthogonal polyline, or Infinity if it doubles back on itself.
function bends(pts: Point[]) {
  const dirs = pts
    .slice(1)
    .map((p, i) => [Math.sign(p.x - pts[i].x), Math.sign(p.y - pts[i].y)])
    .filter(([x, y]) => x || y)
  let n = 0
  for (let i = 1; i < dirs.length; i++) {
    const [[a, b], [c, d]] = [dirs[i - 1], dirs[i]]
    if (a === -c && b === -d) return Infinity
    if (a !== c || b !== d) n++
  }
  return n
}

// An orthogonal polyline from `start` to `end` that leaves and enters perpendicular to the given
// sides, `pad` out first, and stays out of every obstacle inflated by `pad`. A* runs over the sparse
// grid of obstacle edges and stub coordinates; each turn costs `bend`, so routes stay simple.
export function route(
  start: Point,
  startSide: Side,
  end: Point,
  endSide: Side,
  obstacles: Rect[],
  pad = 16,
  bend = 20
): Point[] {
  const sd = outward[startSide]
  const ed = outward[endSide]
  const s = { x: start.x + steps[sd][0] * pad, y: start.y + steps[sd][1] * pad }
  const e = { x: end.x + steps[ed][0] * pad, y: end.y + steps[ed][1] * pad }
  const boxes = obstacles.map(o => ({
    l: o.x - pad,
    t: o.y - pad,
    r: o.x + o.width + pad,
    b: o.y + o.height + pad
  }))
  // Touching a box's border is fine; only its interior blocks
  const blocked = (a: Point, c: Point) =>
    boxes.some(
      k =>
        Math.max(a.x, c.x) > k.l &&
        Math.min(a.x, c.x) < k.r &&
        Math.max(a.y, c.y) > k.t &&
        Math.min(a.y, c.y) < k.b
    )

  // Try the simple shapes first: straight, then a Z/S through the midpoint either way, then an L
  // either way. Fewest bends wins, then shortest; on a tie the earlier shape, so Zs bend mid-way
  // instead of hugging a card.
  const m = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 }
  const simple = [
    [s, e],
    [s, { x: m.x, y: s.y }, { x: m.x, y: e.y }, e],
    [s, { x: s.x, y: m.y }, { x: e.x, y: m.y }, e],
    [s, { x: e.x, y: s.y }, e],
    [s, { x: s.x, y: e.y }, e]
  ]
    .filter(c =>
      c.slice(1).every((q, i) => (q.x === c[i].x || q.y === c[i].y) && !blocked(c[i], q))
    )
    .map(c => [start, ...c, end])
    .map(p => ({ p, n: bends(p), len: length(p) }))
    .filter(c => c.n < Infinity)
    .sort((a, b) => a.n - b.n || a.len - b.len)[0]
  if (simple) return simplify(simple.p)

  const axis = (pick: (k: (typeof boxes)[number]) => number[], a: number, c: number) =>
    [...new Set([...boxes.flatMap(pick), a, c, (a + c) / 2])].sort((m, n) => m - n)
  const xs = axis(k => [k.l, k.r], s.x, e.x)
  const ys = axis(k => [k.t, k.b], s.y, e.y)
  const at = (key: number) => ({
    x: xs[Math.floor(key / ys.length)],
    y: ys[key % ys.length]
  })
  const goal = xs.indexOf(e.x) * ys.length + ys.indexOf(e.y)
  const arrive = (ed + 2) % 4
  const turn = (a: number, c: number) =>
    a === c ? 0 : a === (c + 2) % 4 ? 2 * bend : bend

  // A* over (grid point, heading) states, keyed point * 4 + heading
  const first = (xs.indexOf(s.x) * ys.length + ys.indexOf(s.y)) * 4 + sd
  const cost = new Map([[first, 0]])
  const prev = new Map<number, number>()
  const heap: [f: number, key: number][] = [[0, first]]
  let found = first >> 2 === goal ? first : -1
  while (heap.length && found < 0) {
    const [, key] = pop(heap)
    const pt = key >> 2
    const d = key & 3
    if (pt === goal) found = key
    if (found >= 0) break
    const i = Math.floor(pt / ys.length)
    const j = pt % ys.length
    for (let nd = 0; nd < 4; nd++) {
      if (nd === (d + 2) % 4) continue
      const ni = i + steps[nd][0]
      const nj = j + steps[nd][1]
      if (ni < 0 || nj < 0 || ni >= xs.length || nj >= ys.length) continue
      const a = at(pt)
      const c = { x: xs[ni], y: ys[nj] }
      if (blocked(a, c)) continue
      const next = (ni * ys.length + nj) * 4 + nd
      // Reaching the target stub heading away from the target would U-turn through the card
      if (next >> 2 === goal && nd === ed) continue
      // A turn right at a stub costs 1 more: equal routes otherwise tie, and the heap's pick
      // depends on the axis, so a mirrored layout could hug a card on one axis and not the other
      const g =
        cost.get(key) +
        Math.abs(c.x - a.x) +
        Math.abs(c.y - a.y) +
        turn(d, nd) +
        (pt === first >> 2 && nd !== d ? 1 : 0) +
        (next >> 2 === goal ? turn(nd, arrive) + (nd !== arrive ? 1 : 0) : 0)
      if (g >= (cost.get(next) ?? Infinity)) continue
      cost.set(next, g)
      prev.set(next, key)
      push(heap, [g + Math.abs(e.x - c.x) + Math.abs(e.y - c.y), next])
    }
  }

  if (found < 0) {
    // No clear path: three segments through the midpoint, so the connector still shows
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    const across = sd % 2 === 0
    return simplify([
      start,
      across ? { x: mid.x, y: start.y } : { x: start.x, y: mid.y },
      across ? { x: mid.x, y: end.y } : { x: end.x, y: mid.y },
      end
    ])
  }
  const inner: Point[] = []
  for (let k: number | undefined = found; k !== undefined; k = prev.get(k))
    inner.unshift(at(k >> 2))
  return simplify([start, ...inner, end])
}

// A tiny binary min-heap on the first tuple item.
function push(heap: [number, number][], item: [number, number]) {
  heap.push(item)
  for (let i = heap.length - 1; i > 0; ) {
    const p = (i - 1) >> 1
    if (heap[p][0] <= heap[i][0]) break
    ;[heap[p], heap[i]] = [heap[i], heap[p]]
    i = p
  }
}
function pop(heap: [number, number][]) {
  const top = heap[0]
  const last = heap.pop()
  if (heap.length) {
    heap[0] = last
    for (let i = 0; ; ) {
      const l = 2 * i + 1
      let m = i
      if (l < heap.length && heap[l][0] < heap[m][0]) m = l
      if (l + 1 < heap.length && heap[l + 1][0] < heap[m][0]) m = l + 1
      if (m === i) break
      ;[heap[m], heap[i]] = [heap[i], heap[m]]
      i = m
    }
  }
  return top
}

// The polyline as an SVG path with corners rounded like smoothstep's, plus the label point halfway
// along its length. Same shape as getSmoothStepPath's [path, labelX, labelY].
export function toPath(pts: Point[], radius = 8): [string, number, number] {
  const toward = (p: Point, q: Point, r: number) => ({
    x: p.x + Math.sign(q.x - p.x) * r,
    y: p.y + Math.sign(q.y - p.y) * r
  })
  const len = (p: Point, q: Point) => Math.abs(q.x - p.x) + Math.abs(q.y - p.y)
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, p, b] = [pts[i - 1], pts[i], pts[i + 1]]
    const r = Math.min(radius, len(a, p) / 2, len(p, b) / 2)
    const u = toward(p, a, r)
    const v = toward(p, b, r)
    d += ` L${u.x},${u.y} Q${p.x},${p.y} ${v.x},${v.y}`
  }
  const z = pts[pts.length - 1]
  d += ` L${z.x},${z.y}`

  let half = pts.slice(1).reduce((sum, p, i) => sum + len(pts[i], p), 0) / 2
  for (let i = 1; i < pts.length; i++) {
    const seg = len(pts[i - 1], pts[i])
    if (half <= seg) {
      const label = toward(pts[i - 1], pts[i], half)
      return [d, label.x, label.y]
    }
    half -= seg
  }
  return [d, pts[0].x, pts[0].y]
}
