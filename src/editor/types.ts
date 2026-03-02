import { PieceTable } from './piece_table'

// --- Piece Table ---

export type BufferType = 'Original' | 'Add'

// A contiguous slice of one buffer; pieces in order form the block's text.
export interface Piece {
  buffer: BufferType
  start: number
  len: number
}

// --- Document ---

// A single block-level element; all blocks share one DocumentBuffer.
export interface ElementNode {
  uuid: string
  tag: string // HTML tag: 'p', 'h1'–'h6', 'li', …
  pieceTable: PieceTable
}

// Current selection/cursor state.
export interface SelectionNode {
  block: ElementNode,
  offset: number
}
export interface SelectionState {
  anchor: SelectionNode,
  focus: SelectionNode
  blockRange?: [number, number]
}

// Cursor position returned by handlers after a mutation.
export interface CursorTarget {
  block?: ElementNode
  offset: number
}

// --- Parser ---

// Parsed result of a single line: tag and visible text.
export interface ParsedBlock {
  tag: string
  text: string
}

export interface BlockRule {
  name: string
  match: (line: string) => boolean
  parse: (line: string) => ParsedBlock
}
