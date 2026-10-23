import { expect, test } from 'bun:test'
import { route, toPath } from './route'

type Point = { x: number; y: number }
const pad = 16

// Whether any segment enters the interior of `r` inflated by `pad`.
const crosses = (
  pts: Point[],
  r: { x: number; y: number; width: number; height: number }
) =>
  pts.slice(1).some((p, i) => {
    const a = pts[i]
    return (
      Math.max(a.x, p.x) > r.x - pad &&
      Math.min(a.x, p.x) < r.x + r.width + pad &&
      Math.max(a.y, p.y) > r.y - pad &&
      Math.min(a.y, p.y) < r.y + r.height + pad
    )
  })

test('a clear line stays one straight segment', () => {
  expect(route({ x: 100, y: 25 }, 'right', { x: 300, y: 25 }, 'left', [])).toEqual([
    { x: 100, y: 25 },
    { x: 300, y: 25 }
  ])
})

test('routes around a card in the way', () => {
  const block = { x: 180, y: 0, width: 40, height: 50 }
  const pts = route({ x: 100, y: 25 }, 'right', { x: 300, y: 25 }, 'left', [block])
  expect(pts.length > 2).toBe(true)
  expect(crosses(pts, block)).toBe(false)
  // Every segment is horizontal or vertical
  for (let i = 1; i < pts.length; i++)
    expect(pts[i].x === pts[i - 1].x || pts[i].y === pts[i - 1].y).toBe(true)
})

test('leaves and enters perpendicular to the sides', () => {
  const pts = route({ x: 50, y: 50 }, 'bottom', { x: 300, y: 200 }, 'left', [
    { x: 100, y: 80, width: 100, height: 100 }
  ])
  const [a, b] = pts
  const [y, z] = pts.slice(-2)
  expect(b.x).toBe(a.x)
  expect(b.y - a.y >= pad).toBe(true) // goes down, at least pad out
  expect(y.y).toBe(z.y)
  expect(z.x - y.x >= pad).toBe(true) // comes in from the left
})

test('falls back to three segments through the middle when walled in', () => {
  // The target sits inside a wall, so its stub point is unreachable
  const wall = { x: 250, y: -100, width: 100, height: 300 }
  expect(route({ x: 0, y: 0 }, 'right', { x: 300, y: 100 }, 'left', [wall])).toEqual([
    { x: 0, y: 0 },
    { x: 150, y: 0 },
    { x: 150, y: 100 },
    { x: 300, y: 100 }
  ])
})

const flip = (p: Point) => ({ x: p.y, y: p.x })

test('a clear offset pair takes one Z through the middle, the same on either axis', () => {
  expect(route({ x: 100, y: 25 }, 'right', { x: 300, y: 125 }, 'left', [])).toEqual([
    { x: 100, y: 25 },
    { x: 200, y: 25 },
    { x: 200, y: 125 },
    { x: 300, y: 125 }
  ])
  expect(route({ x: 25, y: 100 }, 'bottom', { x: 125, y: 300 }, 'top', [])).toEqual([
    { x: 25, y: 100 },
    { x: 25, y: 200 },
    { x: 125, y: 200 },
    { x: 125, y: 300 }
  ])
})

test('a card that is not in the way leaves the path alone', () => {
  const clear = route({ x: 100, y: 25 }, 'right', { x: 300, y: 125 }, 'left', [])
  const aside = { x: 120, y: 300, width: 50, height: 50 }
  expect(route({ x: 100, y: 25 }, 'right', { x: 300, y: 125 }, 'left', [aside])).toEqual(
    clear
  )
})

test('swapping x and y mirrors the route', () => {
  const block = { x: 180, y: 5, width: 40, height: 45 }
  const pts = route({ x: 100, y: 25 }, 'right', { x: 300, y: 25 }, 'left', [block])
  const mirrored = route({ x: 25, y: 100 }, 'bottom', { x: 25, y: 300 }, 'top', [
    { x: 5, y: 180, width: 45, height: 40 }
  ])
  expect(mirrored).toEqual(pts.map(flip))
})

test('never enters the target from its far side', () => {
  // The target's right side faces away, so the line must come around, not through the card
  const pts = route({ x: 0, y: 0 }, 'left', { x: 300, y: 200 }, 'right', [])
  const [y, z] = pts.slice(-2)
  expect(y.y).toBe(z.y)
  expect(y.x - z.x >= pad).toBe(true)
})

test('the label sits on the path, halfway along it', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 50 }
  ]
  const [d, x, y] = toPath(pts)
  expect([x, y]).toEqual([75, 0])
  expect(d).toBe('M0,0 L92,0 Q100,0 100,8 L100,50')
})
