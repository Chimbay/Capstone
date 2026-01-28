import type { Piece } from './types'

export class PieceTable {
  private original: string
  private add: string | null
  private pieces: Piece[]
  // Debug purposes
  private strokes: string[]

  public constructor(document: string) {
    this.original = document
    this.add = null
    this.pieces = [{ buffer: 'Original', start: 0, len: document.length }]
  }

  getText(): string {
    return this.pieces
      .map(p => {
        const buf = p.buffer === 'Original' ? this.original : this.add

        return buf.substring(p.start, p.start + p.len)
      })
      .join('')
  }
  getPieces(): Piece[] {
    return this.pieces
  }

  // For debug purposes
  getTable() {
    return {
      original: this.original,
      add: this.add,
      pieces: this.pieces
    }
  }
  setStroke(e: InputEvent) {
    this.strokes.push(e.inputType)
  }
  getStrokes(): string[] {
    return this.strokes
  }
}
