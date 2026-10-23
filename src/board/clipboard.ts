// Copy and paste of cards, as plain logic so it can be unit-tested.
import { serializeBoard, type BoardFile } from './boardFile'
import { toAbsolute } from './geometry'

type Nodes = Parameters<typeof serializeBoard>[1]
type Edges = Parameters<typeof serializeBoard>[2]

// The selected cards (a frame takes its cards along) and the connectors between them, as board-file
// text: that drops the runtime fields, and each paste parses its own objects so pastes never share data.
export function copyCards(nodes: Nodes, edges: Edges): string {
  const selected = new Set(
    nodes.filter(n => (n as { selected?: boolean }).selected).map(n => n.id)
  )
  const picked = nodes.filter(
    n => selected.has(n.id) || (n.parentId && selected.has(n.parentId))
  )
  const ids = new Set(picked.map(n => n.id))
  return serializeBoard(
    '',
    // A card copied without its frame pastes loose, at its place on the canvas
    picked.map(n =>
      n.parentId && !ids.has(n.parentId)
        ? {
            ...n,
            parentId: undefined,
            position: toAbsolute(
              n.position,
              nodes.find(p => p.id === n.parentId)?.position
            )
          }
        : n
    ),
    edges.filter(e => ids.has(e.source) && ids.has(e.target))
  )
}

// Copied cards with new ids, selected and moved down-right; connectors follow their cards.
export function pasteCards(text: string) {
  const { nodes, edges } = JSON.parse(text) as BoardFile
  const ids = new Map(nodes.map(n => [n.id, crypto.randomUUID()]))
  return {
    nodes: nodes.map(n => ({
      ...n,
      id: ids.get(n.id),
      // A card in a frame is placed relative to it, so only the frame moves
      ...(n.parentId
        ? { parentId: ids.get(n.parentId) }
        : { position: { x: n.position.x + 20, y: n.position.y + 20 } }),
      selected: true
    })),
    edges: edges.map(e => ({
      ...e,
      id: crypto.randomUUID(),
      source: ids.get(e.source),
      target: ids.get(e.target)
    }))
  }
}
