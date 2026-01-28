export type BufferType = 'Original' | 'Add'

export interface Piece {
  buffer: BufferType
  start: number
  len: number
}
