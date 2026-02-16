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

export interface DocumentPosition {
  position: number
  node: ElementNode | null
}

export type InputHandler = (block: ElementNode, offset: number, data?: string) => void
export type CursorHandler = (offset: number, data?: string) => number

// Parser
export interface DomNode {
  tag: string
  content: string
}

export interface BlockRule {
  name: string
  match: (line: string) => boolean
  parse: (line: string) => ElementNode
}
