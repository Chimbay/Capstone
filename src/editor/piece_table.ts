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

  // Query
  private findPiece(offset: number): {
    piece: Piece
    index: number
    localOffset: number
  } {
    let accumulated = 0

    for (let i = 0; i < this.pieces.length; i++) {
      if (offset < accumulated + this.pieces[i].len) {
        return { piece: this.pieces[i], index: i, localOffset: offset - accumulated }
      }
      accumulated += this.pieces[i].len
    }

    const last = this.pieces.length - 1
    return { piece: this.pieces[last], index: last, localOffset: this.pieces[last].len }
  }

  public formatText(): string {
    this.track()
    return this.pieces
      .map(piece => {
        const buf = piece.buffer === 'Original' ? this.original : this.add
        return buf.substring(piece.start, piece.start + piece.len)
      })
      .join('')
  }

  // Mutations
  public caretInsert(offset: number, text: string): void {
    const { piece, index, localOffset } = this.findPiece(offset)

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

    piece.len = localOffset
    this.pieces.splice(index + 1, 0, insert, right)
    this.add += text

    this.notify()
  }

  public caretDelete(offset: number): void {
    if (offset <= 0) return
    const { piece, index, localOffset } = this.findPiece(offset - 1)

    if (localOffset === 0) {
      piece.start += 1
      piece.len -= 1
    } else if (localOffset === piece.len - 1) {
      piece.len -= 1
    } else {
      const right: Piece = {
        buffer: piece.buffer,
        start: piece.start + localOffset + 1,
        len: piece.len - localOffset - 1
      }
      piece.len = localOffset
      this.pieces.splice(index + 1, 0, right)
    }

    this.pieces = this.pieces.filter(p => p.len > 0)
    this.notify()
  }
}
