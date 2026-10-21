// The .board.json format: reading, writing, and nothing that needs the canvas (so it can be unit-tested).

export type NoteData = { note: string; title: string }
export type TextData = { text: string }
export type EdgeData = { text: string }

type XY = { x: number; y: number }

// What a .board.json file holds. Positions and data only; the library's runtime fields are not saved.
export interface BoardFile {
  version: 1
  uuid: string
  nodes: {
    id: string
    type: 'note' | 'text'
    position: XY
    width?: number
    height?: number
    data: NoteData | TextData
  }[]
  edges: {
    id: string
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
    type: 'labeled'
    data: EdgeData
  }[]
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

// Board files are user-editable on disk, so check the shape before handing them to the canvas.
// A file that isn't a board at all is refused. Inside a board, one bad entry shouldn't blank the
// whole canvas: fixable fields get defaults, unusable entries are dropped, and `repaired` counts both
// so the user can be told (the next save writes the repaired version).
export function parseBoard(text: string): { file: BoardFile; repaired: number } {
  const raw = JSON.parse(text) as unknown
  if (
    !isObject(raw) ||
    typeof raw.uuid !== 'string' ||
    !Array.isArray(raw.nodes) ||
    !Array.isArray(raw.edges)
  )
    throw new Error('not a board file')
  // Files from before versioning are version 1. Refuse newer ones rather than save over fields we'd drop.
  const version = raw.version ?? 1
  if (version !== 1)
    throw new Error(
      `board format version ${JSON.stringify(version)} is newer than this app`
    )

  let repaired = 0
  const ids = new Set<string>()
  const nodes: BoardFile['nodes'] = []
  for (const n of raw.nodes as unknown[]) {
    // Unusable: no id to key it by, a duplicate id, or a card type this app doesn't know.
    if (
      !isObject(n) ||
      typeof n.id !== 'string' ||
      ids.has(n.id) ||
      (n.type !== 'note' && n.type !== 'text')
    ) {
      repaired++
      continue
    }
    const pos = n.position
    const posOk = isObject(pos) && isNumber(pos.x) && isNumber(pos.y)
    const position = posOk ? { x: pos.x as number, y: pos.y as number } : { x: 0, y: 0 }
    const data = isObject(n.data) ? n.data : {}
    const dataOk =
      n.type === 'text'
        ? typeof data.text === 'string'
        : typeof data.note === 'string' && typeof data.title === 'string'
    if (!posOk || !dataOk) repaired++
    ids.add(n.id)
    nodes.push({
      ...(n as object),
      id: n.id,
      type: n.type,
      position,
      data:
        n.type === 'text'
          ? { ...data, text: typeof data.text === 'string' ? data.text : '' }
          : {
              ...data,
              note: typeof data.note === 'string' ? data.note : '',
              title: typeof data.title === 'string' ? data.title : 'Missing note'
            }
    } as BoardFile['nodes'][number])
  }
  const edgeIds = new Set<string>()
  const edges: BoardFile['edges'] = []
  for (const e of raw.edges as unknown[]) {
    // Unusable: no id, a duplicate, or an end that isn't a card on this board.
    if (
      !isObject(e) ||
      typeof e.id !== 'string' ||
      edgeIds.has(e.id) ||
      typeof e.source !== 'string' ||
      typeof e.target !== 'string' ||
      !ids.has(e.source) ||
      !ids.has(e.target)
    ) {
      repaired++
      continue
    }
    const data = isObject(e.data) ? e.data : {}
    if (typeof data.text !== 'string') repaired++
    edgeIds.add(e.id)
    edges.push({
      ...(e as object),
      type: 'labeled',
      data: { ...data, text: typeof data.text === 'string' ? data.text : '' }
    } as BoardFile['edges'][number])
  }
  return {
    file: { ...(raw as object), version: 1, uuid: raw.uuid, nodes, edges } as BoardFile,
    repaired
  }
}

// Live canvas state, as the library's stores hold it (plus runtime fields we don't save).
type LiveNode = {
  id: string
  type?: string
  position: XY
  width?: number
  height?: number
  data: object
}
type LiveEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: string
  data?: object
}

// `data` is copied whole, so fields added to cards or connectors later are saved without touching this.
export function serializeBoard(
  uuid: string,
  nodes: readonly LiveNode[],
  edges: readonly LiveEdge[]
): string {
  const file: BoardFile = {
    version: 1,
    uuid,
    nodes: nodes.map(n => ({
      id: n.id,
      type: n.type as BoardFile['nodes'][number]['type'],
      position: { x: n.position.x, y: n.position.y },
      ...(n.width !== undefined && { width: n.width }),
      ...(n.height !== undefined && { height: n.height }),
      data: n.data as NoteData | TextData
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: 'labeled' as const,
      data: { text: '', ...e.data }
    }))
  }
  return JSON.stringify(file, null, 2)
}
