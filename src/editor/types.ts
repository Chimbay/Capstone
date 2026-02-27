import { PieceTable } from './piece_table'

// --- Piece Table ---

export type BufferType = 'Original' | 'Add'

// A Piece describes a contiguous slice of one of the two buffers.
// The logical document text is reconstructed by reading pieces in order.
export interface Piece {
  buffer: BufferType
  start: number // byte offset into the buffer string
  len: number // number of characters
}

// --- Document ---

// A single block-level element (paragraph, heading, list item, …).
// Each block owns its piece list; all blocks share the same DocumentBuffer.
export interface ElementNode {
  uuid: string
  tag: string // HTML tag: 'p', 'h1'–'h6', 'li', …
  pieceTable: PieceTable
}

// The current selection/cursor state, updated on every beforeinput event.
export interface SelectionNode {
  block: ElementNode,
  offset: number
}
export interface SelectionState {
  anchor: SelectionNode,
  focus: SelectionNode
  blockRange?: [number, number]
}

// Where the cursor should land after a mutation.
// blockId is optional — same-block handlers omit it and render.ts fills it in.
export interface CursorTarget {
  block?: ElementNode
  offset: number
}

// --- Parser ---

// What a parser rule extracts from a line.
// tag  — the HTML tag to render as
// text — the visible text content (markdown syntax stripped)
export interface ParsedBlock {
  tag: string
  text: string
}

export interface BlockRule {
  name: string
  match: (line: string) => boolean
  parse: (line: string) => ParsedBlock
}
