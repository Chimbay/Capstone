import { createSignal } from 'solid-js'
import { Piece } from './types'

export class PieceTable {
  original: string
  add: string
  pieces: Piece[]
  private notify: () => void
  private track: () => void

  public constructor(initialText: string) {
    const textLength = initialText.length
    this.original = initialText
    this.add = ''
    this.pieces = [{ buffer: 'Original', start: 0, len: textLength }]

    const [version, setVersion] = createSignal(0)
    this.track = version
    this.notify = () => setVersion(v => v + 1)
  }

  // Assembles the text
  public formatText(): string {
    this.track()
    return this.pieces
      .map(piece => {
        const buf = piece.buffer === 'Original' ? this.original : this.add

        return buf.substring(piece.start, piece.start + piece.len)
      })
      .join('')
  }

  public insert(offset: number, text: string): void {
    const { index, localOffset } = this.findPiece(offset)
    const piece = this.pieces[index]

    const right: Piece = {
      buffer: piece.buffer,
      start: piece.start + localOffset,
      len: piece.len - localOffset
    }

    const insert: Piece = {
      buffer: 'Add',
      start: this.add.length,
      len: text.length
    }

    // Shrink original to left half
    piece.len = localOffset

    // Splice in the new piece and right half
    this.pieces.splice(index + 1, 0, insert, right)

    // Append to add buffer
    this.add += text

    this.notify()
  }

  private findPiece(offset: number): { index: number; localOffset: number } {
    let accumulated = 0

    for (let i = 0; i < this.pieces.length; i++) {
      if (offset <= accumulated + this.pieces[i].len) {
        return { index: i, localOffset: offset - accumulated }
      }
      accumulated += this.pieces[i].len
    }

    const last = this.pieces.length - 1
    return { index: last, localOffset: this.pieces[last].len }
  }
}
