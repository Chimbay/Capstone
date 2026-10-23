import { expect, test } from 'bun:test'
import { copyCards, pasteCards } from './clipboard'

const nodes = [
  {
    id: 'a',
    type: 'text',
    position: { x: 0, y: 0 },
    data: { text: 'A' },
    selected: true
  },
  {
    id: 'b',
    type: 'text',
    position: { x: 50, y: 0 },
    data: { text: 'B' },
    selected: true
  },
  { id: 'c', type: 'text', position: { x: 99, y: 0 }, data: { text: 'C' } }
]
const edges = [
  { id: 'ab', source: 'a', target: 'b', sourceHandle: 'right', data: { text: 'x' } },
  { id: 'bc', source: 'b', target: 'c', data: { text: '' } }
]

test('pasting copies selected cards and the connectors between them, with new ids', () => {
  const { nodes: n, edges: e } = pasteCards(copyCards(nodes, edges))
  expect(n.map(x => x.data)).toEqual([{ text: 'A' }, { text: 'B' }])
  expect(n[0].position).toEqual({ x: 20, y: 20 })
  expect(n.every(x => x.selected && !['a', 'b'].includes(x.id))).toBe(true)
  expect(e.length).toBe(1) // b->c leaves the selection
  expect([e[0].source, e[0].target]).toEqual([n[0].id, n[1].id])
  expect(['ab'].includes(e[0].id)).toBe(false)
  expect(e[0].sourceHandle).toBe('right')
})

test('pastes never share data objects', () => {
  const text = copyCards(nodes, edges)
  expect(pasteCards(text).nodes[0].data === pasteCards(text).nodes[0].data).toBe(false)
})

test('a copied frame takes its cards; a card copied alone leaves its frame', () => {
  const framed = [
    {
      id: 'f',
      type: 'frame',
      position: { x: 100, y: 100 },
      data: { title: 'S' },
      selected: true
    },
    {
      id: 'in',
      type: 'text',
      parentId: 'f',
      position: { x: 10, y: 10 },
      data: { text: '' }
    }
  ]
  const both = pasteCards(copyCards(framed, [])).nodes
  expect(both[0].position).toEqual({ x: 120, y: 120 })
  expect(both[1].parentId).toBe(both[0].id)
  expect(both[1].position).toEqual({ x: 10, y: 10 }) // moves with its frame

  const alone = framed.map(n => ({ ...n, selected: n.id === 'in' }))
  const [card] = pasteCards(copyCards(alone, [])).nodes
  expect(card.parentId).toBe(undefined)
  expect(card.position).toEqual({ x: 130, y: 130 })
})
