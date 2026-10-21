import { expect, test } from 'bun:test'
import { createHistory } from './history'

test('undo and redo walk back and forth through recorded steps', () => {
  const restored: string[] = []
  const h = createHistory('a', s => restored.push(s))
  h.record('b')
  h.record('c')
  expect(h.undo()).toBe(true)
  expect(h.undo()).toBe(true)
  expect(h.undo()).toBe(false) // past the beginning
  expect(h.redo()).toBe(true)
  expect(restored).toEqual(['b', 'a', 'b'])
})

test('recording an unchanged snapshot adds no step', () => {
  const h = createHistory('a', () => {})
  expect(h.record('a')).toBe(false)
  expect(h.undo()).toBe(false)
})

test('a new change clears redo', () => {
  const restored: string[] = []
  const h = createHistory('a', s => restored.push(s))
  h.record('b')
  h.undo()
  h.record('c')
  expect(h.redo()).toBe(false)
  expect(h.undo()).toBe(true)
  expect(restored).toEqual(['a', 'a'])
})
