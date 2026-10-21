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
  const { file, repaired } = parseBoard(text)
  assert.equal(repaired, 0)
  assert.equal(file.version, 1)
  assert.deepEqual(file.nodes[0], { id: 'a', type: 'note', position: { x: 1, y: 2 }, data: { note: 'n1', title: 'T', extra: [1] } })
  assert.deepEqual(file.nodes[1], { id: 'b', type: 'text', position: { x: 3, y: 4 }, width: 200, height: 80, data: { text: 'hi' } })
  assert.deepEqual(file.edges[0].data, { text: 'x', color: 'red' })
  // Saving what was loaded writes the same text, so an untouched board isn't seen as changed.
  assert.equal(serializeBoard(file.uuid, file.nodes, file.edges), text)
})

void test('edge without data gets an empty label', () => {
  const ends = [
    { id: 'a', type: 'text', position: { x: 0, y: 0 }, data: { text: '' } },
    { id: 'b', type: 'text', position: { x: 0, y: 0 }, data: { text: '' } }
  ]
  const { file } = parseBoard(serializeBoard('u', ends, [{ id: 'e', source: 'a', target: 'b' }]))
  assert.deepEqual(file.edges[0].data, { text: '' })
})

void test('missing version reads as 1; newer versions and non-boards are refused', () => {
  assert.equal(parseBoard('{"uuid":"u","nodes":[],"edges":[]}').file.version, 1)
  assert.throws(() => parseBoard('{"version":2,"uuid":"u","nodes":[],"edges":[]}'), /newer/)
  assert.throws(() => parseBoard('{"uuid":"u"}'), /not a board/)
})

void test('bad entries are repaired or dropped instead of breaking the board', () => {
  const { file, repaired } = parseBoard(
    JSON.stringify({
      uuid: 'u',
      nodes: [
        { id: 'ok', type: 'text', position: { x: 5, y: 6 }, data: { text: 'fine' } },
        { id: 'nopos', type: 'text', data: { text: 'lost its position' } }, // repaired: placed at 0,0
        { id: 'nodata', type: 'note', position: { x: 1, y: 1 } }, // repaired: empty note link
        { type: 'text', position: { x: 0, y: 0 }, data: { text: 'no id' } }, // dropped
        { id: 'ok', type: 'text', position: { x: 0, y: 0 }, data: { text: 'duplicate' } }, // dropped
        { id: 'odd', type: 'sticker', position: { x: 0, y: 0 }, data: {} }, // dropped: unknown type
        'not even an object' // dropped
      ],
      edges: [
        { id: 'e1', source: 'ok', target: 'nopos', data: { text: 'kept' } },
        { id: 'e2', source: 'ok', target: 'missing' }, // dropped: no such card
        { id: 'e3', source: 'ok', target: 'nodata' } // repaired: empty label
      ]
    })
  )
  assert.deepEqual(file.nodes.map(n => n.id), ['ok', 'nopos', 'nodata'])
  assert.deepEqual(file.nodes[1].position, { x: 0, y: 0 })
  assert.deepEqual(file.nodes[2].data, { note: '', title: 'Missing note' })
  assert.deepEqual(file.edges.map(e => [e.id, e.data.text]), [['e1', 'kept'], ['e3', '']])
  assert.equal(repaired, 2 + 4 + 2) // nopos, nodata; four dropped cards; e2 dropped, e3 repaired
  assert.equal(parseBoard(serializeBoard(file.uuid, file.nodes, file.edges)).repaired, 0)
})
