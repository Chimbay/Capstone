export type BufferType = 'Original' | 'Add'
export interface Piece {
  buffer: BufferType
  start: number
  len: number
}

export interface FileMetadata {
  uuid: string
  display_name: string
  path: string
  created: string
  modified: string
}
