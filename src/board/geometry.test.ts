import { expect, test } from 'bun:test'
import {
  absRect,
  alignTo,
  boundsOf,
  facingSide,
  frameAt,
  orientEdge,
  ringSection,
  sidePoint,
  splitEdge,
  toAbsolute,
  toRelative
} from './geometry'

const src = { x: 0, y: 0, width: 100, height: 50 }
const at = (x: number, y: number) => ({ x, y, width: 100, height: 50 })

test('facingSide picks the side of the target that faces the source', () => {
  expect(facingSide(src, at(300, 20))).toBe('left') // target to the right
  expect(facingSide(src, at(-300, -20))).toBe('right') // to the left
  expect(facingSide(src, at(20, 200))).toBe('top') // below
  expect(facingSide(src, at(-20, -200))).toBe('bottom') // above
  expect(facingSide(src, at(150, -150))).toBe('left') // diagonal tie goes horizontal
})

test('sidePoint is the middle of the side', () => {
  const r = at(10, 20)
  expect(sidePoint(r, 'top')).toEqual({ x: 60, y: 20 })
  expect(sidePoint(r, 'right')).toEqual({ x: 110, y: 45 })
  expect(sidePoint(r, 'bottom')).toEqual({ x: 60, y: 70 })
  expect(sidePoint(r, 'left')).toEqual({ x: 10, y: 45 })
})

test('orientEdge points both ends at each other', () => {
  const ends = (sourceHandle: string, targetHandle: string) => ({
    sourceHandle,
    targetHandle
  })
  expect(orientEdge(src, at(300, 20))).toEqual(ends('right', 'left')) // A left of B
  expect(orientEdge(src, at(20, 200))).toEqual(ends('bottom', 'top')) // A above B
  expect(orientEdge(src, at(150, 150))).toEqual(ends('right', 'left')) // diagonal tie goes horizontal
})

test('splitEdge routes A→B through the card, facing each end', () => {
  const edge = {
    id: 'e',
    source: 'a',
    target: 'b',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    type: 'labeled',
    data: { text: 'next', arrow: 'both' as const, dashed: true }
  }
  const card = { id: 'c', x: 0, y: 200, width: 100, height: 50 }
  const live = { ...edge, selected: true }
  const [first, second] = splitEdge(live, src, at(0, 400), card, 'e2')
  expect(first).toEqual({ ...edge, target: 'c', targetHandle: 'top' })
  expect(second).toEqual({
    ...edge,
    id: 'e2',
    source: 'c',
    sourceHandle: 'bottom',
    data: { text: '', arrow: 'both', dashed: true }
  })
  // Runtime state from the live store isn't carried into either half
  expect('selected' in first).toBe(false)
  expect('selected' in second).toBe(false)
})

test('alignTo snaps left edge to left edge, with a guide spanning both cards', () => {
  const { dx, dy, guides } = alignTo(at(3, 200), [src], 6)
  expect([dx, dy]).toEqual([-3, 0])
  expect(guides).toEqual([{ x1: 0, y1: 0, x2: 0, y2: 250 }])
})

test('alignTo snaps center to center on both axes', () => {
  const other = { x: 300, y: 0, width: 200, height: 100 }
  const { dx, dy, guides } = alignTo({ x: 372, y: 22, width: 50, height: 50 }, [other], 6)
  expect([dx, dy]).toEqual([3, 3])
  expect(guides).toEqual([
    { x1: 400, y1: 0, x2: 400, y2: 100 },
    { x1: 300, y1: 50, x2: 500, y2: 50 }
  ])
})

test('alignTo leaves the card alone when nothing is within the threshold', () => {
  expect(alignTo(at(37, 137), [src], 6)).toEqual({ dx: 0, dy: 0, guides: [] })
})

test('alignTo takes the closest match on each axis', () => {
  const near = at(5, 400)
  const nearer = at(8, 800)
  const { dx, guides } = alignTo(at(10, 600), [near, nearer], 6)
  expect(dx).toBe(-2)
  expect(guides[0]).toEqual({ x1: 8, y1: 600, x2: 8, y2: 850 })
})

test('ringSection picks the quarter the pointer points into, clockwise from the top', () => {
  const pick = (dx: number, dy: number) => ringSection(dx, dy, 4, 20, 120)
  expect(pick(0, -50)).toBe(0) // up
  expect(pick(30, -100)).toBe(0) // up, off-axis but within the top quarter
  expect(pick(50, 0)).toBe(1) // right
  expect(pick(0, 50)).toBe(2) // down
  expect(pick(-50, 0)).toBe(3) // left
  expect(pick(-60, -50)).toBe(3) // up-left, closer to left
  expect(pick(0, 0)).toBe(null) // dead center
  expect(pick(10, 10)).toBe(null) // inside the minimum radius
  expect(pick(0, -121)).toBe(null) // beyond the max
  expect(pick(0, -120)).toBe(0) // at the max still counts
  // Any count works: five sections are 72° each
  const five = (dx: number, dy: number) => ringSection(dx, dy, 5, 20, 120)
  expect(five(0, -50)).toBe(0) // up
  expect(five(50, -20)).toBe(1) // right, a little up
  expect(five(30, 50)).toBe(2) // down-right
  expect(five(-30, 50)).toBe(3) // down-left
  expect(five(-50, -20)).toBe(4) // left, a little up
})

test('a card in a frame converts between frame-relative and canvas positions', () => {
  const frame = { x: 100, y: 50 }
  expect(toAbsolute({ x: 10, y: 20 }, frame)).toEqual({ x: 110, y: 70 })
  expect(toRelative({ x: 110, y: 70 }, frame)).toEqual({ x: 10, y: 20 })
  expect(toAbsolute({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 }) // no frame
  const nodes = [{ id: 'f', position: frame }]
  const card = { position: { x: 10, y: 20 }, width: 100, height: 50 }
  expect(absRect({ ...card, parentId: 'f' }, nodes)).toEqual(at(110, 70))
  expect(absRect({ ...card, parentId: 'gone' }, nodes)).toEqual(at(10, 20))
})

test('boundsOf wraps all rects plus padding', () => {
  expect(boundsOf([at(0, 0), at(200, 100)], 40)).toEqual({
    x: -40,
    y: -40,
    width: 380,
    height: 230
  })
})

test('frameAt picks by the card center, keeps the current frame, else the smallest', () => {
  const big = { id: 'big', x: 0, y: 0, width: 600, height: 400 }
  const small = { id: 'small', x: 50, y: 50, width: 200, height: 200 }
  expect(frameAt(at(60, 60), [big, small])?.id).toBe('small')
  expect(frameAt(at(60, 60), [big, small], 'big')?.id).toBe('big')
  expect(frameAt(at(530, 360), [big, small])?.id).toBe('big') // half over the border
  expect(frameAt(at(580, 380), [big, small])).toBe(undefined) // center outside
})
