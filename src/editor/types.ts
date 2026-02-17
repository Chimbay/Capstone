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

// Handlers
export type CaretInputHandler = (block: ElementNode, offset: number, data?: string) => void
export type CaretCursorHandler = (offset: number, data?: string) => number

export type SelectionInputHandler = (block: ElementNode, start: number, end: number, data?: string) => void
export type SelectionCursorHandler = (start: number, end: number, data?: string) => number

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
