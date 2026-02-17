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

  private findPiece(offset: number): { piece: Piece; index: number; localOffset: number } {
    let accumulated = 0

    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i]
      const rangeEnd = accumulated + p.len
      if (offset <= rangeEnd) {
        return { piece: p, index: i, localOffset: offset - accumulated }
      }
      accumulated += p.len
    }

    const last = this.pieces.length - 1
    return { piece: this.pieces[last], index: last, localOffset: this.pieces[last].len }
  }

  private removePiece(piece: Piece): void {
    const index = this.pieces.indexOf(piece)
    if (index !== -1) this.pieces.splice(index, 1)
  }

  private removeEmptyPieces(): void {
    this.pieces = this.pieces.filter(p => p.len > 0)
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

  // Caret mutations

  private canCoalesce(piece: Piece, localOffset: number): boolean {
    return (
      piece.buffer === 'Add' &&
      piece.start + piece.len === this.add.length &&
      localOffset === piece.len
    )
  }

  public caretInsert(offset: number, text: string): void {
    const { piece, index, localOffset } = this.findPiece(offset)

    if (this.canCoalesce(piece, localOffset)) {
      piece.len += text.length
    } else {
      const inserted: Piece = {
        buffer: 'Add',
        start: this.add.length,
        len: text.length
      }

      if (localOffset < piece.len) {
        const right: Piece = {
          buffer: piece.buffer,
          start: piece.start + localOffset,
          len: piece.len - localOffset
        }
        this.pieces.splice(index + 1, 0, inserted, right)
      } else {
        this.pieces.splice(index + 1, 0, inserted)
      }

      piece.len = localOffset
    }

    this.add += text
    this.notify()
  }

  public caretDelete(offset: number): void {
    if (offset <= 0) return

    const { piece, index, localOffset } = this.findPiece(offset)

    if (piece.len === 1) {
      this.removePiece(piece)
    } else if (localOffset === 0) {
      piece.start += 1
      piece.len -= 1
    } else if (localOffset === piece.len) {
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

    this.notify()
  }

  // Range mutations

  public rangeDelete(start: number, end: number): void {
    if (start >= end) return

    const { index: startIndex, localOffset: startLocal } = this.findPiece(start)
    const { index: endIndex, localOffset: endLocal } = this.findPiece(end)

    if (startIndex === endIndex) {
      const piece = this.pieces[startIndex]
      const right: Piece = {
        buffer: piece.buffer,
        start: piece.start + endLocal,
        len: piece.len - endLocal
      }
      piece.len = startLocal
      this.pieces.splice(startIndex + 1, 0, right)
    } else {
      this.pieces[startIndex].len = startLocal

      const endPiece = this.pieces[endIndex]
      endPiece.start += endLocal
      endPiece.len -= endLocal

      this.pieces.splice(startIndex + 1, endIndex - startIndex - 1)
    }

    this.removeEmptyPieces()
    this.notify()
  }
}
