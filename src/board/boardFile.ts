// The .board.json format: reading, writing, and nothing that needs the canvas (so it can be unit-tested).

export type NoteData = { note: string; title: string }
export type TextData = { text: string }
export type EdgeData = { text: string }

type XY = { x: number; y: number }

// What a .board.json file holds. Positions and data only; the library's runtime fields are not saved.
export interface BoardFile {
  version: 1
  uuid: string
  nodes: { id: string; type: 'note' | 'text'; position: XY; width?: number; height?: number; data: NoteData | TextData }[]
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

// Board files are user-editable on disk, so check the shape before handing them to the canvas.
export function parseBoard(text: string): BoardFile {
  const file = JSON.parse(text) as Partial<Omit<BoardFile, 'version'>> & { version?: unknown }
  if (typeof file.uuid !== 'string' || !Array.isArray(file.nodes) || !Array.isArray(file.edges))
    throw new Error('not a board file')
  // Files from before versioning are version 1. Refuse newer ones rather than save over fields we'd drop.
  const version = file.version ?? 1
  if (version !== 1) throw new Error(`board format version ${JSON.stringify(version)} is newer than this app`)
  return { ...file, version } as BoardFile
}

// Live canvas state, as the library's stores hold it (plus runtime fields we don't save).
type LiveNode = { id: string; type?: string; position: XY; width?: number; height?: number; data: object }
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
export function serializeBoard(uuid: string, nodes: readonly LiveNode[], edges: readonly LiveEdge[]): string {
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
