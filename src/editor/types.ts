import { PieceTable } from './piece_table'

export type BufferType = 'Original' | 'Add'

export interface Piece {
  buffer: BufferType
  start: number
  len: number
}

// Parse types
export interface DomNode {
  tag: string
  content: string
}
export interface ElementNode {
  tag: string
  pieceTable: PieceTable
}

export interface BlockRule {
  name: string
  match: (line: string) => boolean
  parse: (line: string) => ElementNode
}
