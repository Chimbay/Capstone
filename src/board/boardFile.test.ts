import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseBoard, serializeBoard } from './boardFile'

const nodes = [
  { id: 'a', type: 'note', position: { x: 1, y: 2 }, data: { note: 'n1', title: 'T', extra: [1] }, selected: true },
  { id: 'b', type: 'text', position: { x: 3, y: 4 }, width: 200, height: 80, data: { text: 'hi' }, measured: { width: 9 } }
]
const edges = [
  { id: 'e', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: null, type: 'labeled', data: { text: 'x', color: 'red' } }
]

void test('round-trips and keeps unknown data fields', () => {
  const text = serializeBoard('u', nodes, edges)
  const file = parseBoard(text)
  assert.equal(file.version, 1)
  assert.deepEqual(file.nodes[0], { id: 'a', type: 'note', position: { x: 1, y: 2 }, data: { note: 'n1', title: 'T', extra: [1] } })
  assert.deepEqual(file.nodes[1], { id: 'b', type: 'text', position: { x: 3, y: 4 }, width: 200, height: 80, data: { text: 'hi' } })
  assert.deepEqual(file.edges[0].data, { text: 'x', color: 'red' })
  // Saving what was loaded writes the same text, so an untouched board isn't seen as changed.
  assert.equal(serializeBoard(file.uuid, file.nodes, file.edges), text)
})

void test('edge without data gets an empty label', () => {
  const file = parseBoard(serializeBoard('u', [], [{ id: 'e', source: 'a', target: 'b' }]))
  assert.deepEqual(file.edges[0].data, { text: '' })
})

void test('missing version reads as 1; newer versions and non-boards are refused', () => {
  assert.equal(parseBoard('{"uuid":"u","nodes":[],"edges":[]}').version, 1)
  assert.throws(() => parseBoard('{"version":2,"uuid":"u","nodes":[],"edges":[]}'), /newer/)
  assert.throws(() => parseBoard('{"uuid":"u"}'), /not a board/)
})
