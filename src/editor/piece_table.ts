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

  private findPiece(offset: number): { index: number; localOffset: number } {
    let accumulated = 0

    for (let i = 0; i < this.pieces.length; i++) {
      if (offset < accumulated + this.pieces[i].len) {
        return { index: i, localOffset: offset - accumulated }
      }
      accumulated += this.pieces[i].len
    }

    const last = this.pieces.length - 1
    return { index: last, localOffset: this.pieces[last].len }
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

  public caretInsert(offset: number, text: string): void {
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
  public caretDelete(offset: number): void {
    // Two cases:
    // - A piece has a len of > 0
    // - Vice versa
    const { index, localOffset } = this.findPiece(offset - 1)
    const piece = this.pieces[index]
    console.log('Local offset: ', localOffset)
    if (piece.len > 1) {
      if (localOffset === 0) {
        // Deleting first char of piece
        piece.start += 1
        piece.len -= 1
      } else if (localOffset === piece.len - 1) {
        // Deleting last char of piece
        piece.len -= 1
      } else {
        // Deleting in the middle — split around the deleted char
        const right: Piece = {
          buffer: piece.buffer,
          start: piece.start + localOffset + 1,
          len: piece.len - localOffset - 1
        }
        piece.len = localOffset
        this.pieces.splice(index + 1, 0, right)
      }
    } else {
      // Offset is represented as -1 or the beginning of a line
      
      this.pieces.splice(index, 1)
    }

    this.pieces = this.pieces.filter(p => p.len > 0)
    this.notify()
  }
}
