import { expect, test } from 'bun:test'
import { parseRingDelay } from '.'

test('a stored delay is kept only if it is one of the choices', () => {
  expect(parseRingDelay('1000')).toBe(1000)
  expect(parseRingDelay('0')).toBe(0)
  expect(parseRingDelay(null)).toBe(400)
  expect(parseRingDelay('')).toBe(400) // Number('') would be 0, which is Off
  expect(parseRingDelay('250')).toBe(400)
  expect(parseRingDelay('abc')).toBe(400)
})
