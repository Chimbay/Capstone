import { PieceTable } from './piece_table'

// Piece Table
export type BufferType = 'Original' | 'Add'

export interface Piece {
  buffer: BufferType
  start: number
  len: number
}

// Document
export interface ElementNode {
  uuid: string
  tag: string
  pieceTable: PieceTable
}

export interface SelectionState {
  node: ElementNode | null
  collapsed: boolean
  start: number
  end: number
}

export interface CursorTarget {
  blockId?: string
  offset: number
}

// Parser
export interface BlockRule {
  name: string
  match: (line: string) => boolean
  parse: (line: string) => ElementNode
}
