import { Piece } from './types'

export class PieceTable {
  original: string
  add: string | null
  pieces: Piece[]

  public constructor(initialText: string) {
    const textLength = initialText.length
    this.original = initialText

    this.add = null
    this.pieces = [{ buffer: 'Original', start: 0, len: textLength }]
  }

  // Assembles the text
  public formatText(): string {
    return this.pieces
      .map(piece => {
        const buf = piece.buffer === 'Original' ? this.original : this.add

        return buf.substring(piece.start, piece.start + piece.len)
      })
      .join('')
  }
}
