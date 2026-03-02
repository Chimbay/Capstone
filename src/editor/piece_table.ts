import { createStore, produce, SetStoreFunction } from 'solid-js/store'
import { DocumentBuffer } from './buffer'
import { Piece } from './types'

// Text content of a single block as an ordered list of buffer slices.
export class PieceTable {
  buffer: DocumentBuffer
  pieces: Piece[]
  private setPieces: SetStoreFunction<Piece[]>

  constructor(buffer: DocumentBuffer, initialPieces: Piece[]) {
    this.buffer = buffer
    const [piece, setPieces] = createStore<Piece[]>(initialPieces)
    this.pieces = piece
    this.setPieces = setPieces
  }

  // --- Helpers ---

  // Finds the piece at a document offset, returns piece, index, and local offset.
  private findPiece(offset: number): {
    piece: Piece
    index: number
    localOffset: number
  } {
    let accumulated = 0

    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i]
      if (offset <= accumulated + p.len) {
        return { piece: p, index: i, localOffset: offset - accumulated }
      }
      accumulated += p.len
    }

    // Case: offset past end, clamp to last piece
    const last = this.pieces.length - 1
    return { piece: this.pieces[last], index: last, localOffset: this.pieces[last].len }
  }

  private removePiece(index: number): void {
    this.setPieces(produce((p: Piece[]) => p.splice(index, 1)))
  }

  // --- Read ---

  // Reconstructs visible text from all pieces.
  public formatText(): string {
    return this.pieces
      .map(p => {
        const buf = p.buffer === 'Original' ? this.buffer.original : this.buffer.add
        return buf.substring(p.start, p.start + p.len)
      })
      .join('')
  }

  public totalLength(): number {
    return this.pieces.reduce((sum, p) => sum + p.len, 0)
  }

  // --- Table mutations ---

  // Splits at offset: keeps left half, returns right half.
  public splitPieces(offset: number): Piece[] {
    // Case: empty block
    if (this.pieces.length === 0) return []

    const { piece, index, localOffset } = this.findPiece(offset)

    // Case: cursor is mid-piece, split the piece in two
    if (localOffset > 0 && localOffset < piece.len) {
      const rightHalf: Piece = {
        buffer: piece.buffer,
        start: piece.start + localOffset,
        len: piece.len - localOffset
      }
      const rest = this.pieces.slice(index + 1)
      this.setPieces(index, 'len', localOffset)
      this.setPieces(produce((p: Piece[]) => p.splice(index + 1)))
      return [rightHalf, ...rest]
    }

    // Case: cursor at start of piece, entire piece goes right
    if (localOffset === 0) {
      const right = this.pieces.slice(index)
      this.setPieces(produce((p: Piece[]) => p.splice(index)))
      return right
    }

    // Case: cursor at end of piece, everything after goes right
    const right = this.pieces.slice(index + 1)
    this.setPieces(produce((p: Piece[]) => p.splice(index + 1)))
    return right
  }

  // Appends pieces from another table, array, or single piece.
  public append(arg: Piece | Piece[] | PieceTable): void {
    const incoming =
      arg instanceof PieceTable ? arg.pieces : Array.isArray(arg) ? arg : [arg]
    this.setPieces(prev => [...prev, ...incoming])
  }
  // Completely rewrites the piece table
  public setPieceTable(pieces: Piece[]): void {
    this.setPieces(() => [...pieces])
  }
  // --- Caret mutations ---

  // True if the next insert can extend the last Add piece in place.
  private canCoalesce(piece: Piece, localOffset: number, addStart: number): boolean {
    return (
      piece.buffer === 'Add' &&
      piece.start + piece.len === addStart &&
      localOffset === piece.len
    )
  }

  // Inserts text at offset, coalescing into the previous piece if possible.
  public caretInsert(offset: number, text: string): void {
    // Case: empty block, create first piece
    if (this.pieces.length === 0) {
      const p: Piece = { buffer: 'Add', start: this.buffer.add.length, len: text.length }
      this.buffer.add += text
      this.append(p)
      return
    }

    const addStart = this.buffer.add.length
    const { piece, index, localOffset } = this.findPiece(offset)

    // Case: coalesce, grow existing Add piece in place
    if (this.canCoalesce(piece, localOffset, addStart)) {
      this.buffer.add += text
      this.setPieces(index, 'len', piece.len + text.length)
      return
    }

    const inserted: Piece = { buffer: 'Add', start: addStart, len: text.length }
    this.buffer.add += text

    // Case: mid-piece, split into [left, inserted, right]
    if (localOffset < piece.len) {
      const right: Piece = {
        buffer: piece.buffer,
        start: piece.start + localOffset,
        len: piece.len - localOffset
      }
      this.setPieces(produce((p: Piece[]) => p.splice(index + 1, 0, inserted, right)))
    } else {
      // Case: end of piece, append after it
      this.setPieces(produce((p: Piece[]) => p.splice(index + 1, 0, inserted)))
    }

    this.setPieces(index, 'len', localOffset)
  }

  // Deletes the character before the cursor.
  public caretDelete(offset: number): void {
    // Case: start of block
    if (offset <= 0) return

    const { piece, index, localOffset } = this.findPiece(offset)
    // Case: single-char piece, remove entirely
    if (piece.len === 1) {
      this.removePiece(index)
      return
    }
    // Case: Deleting the first character
    if (localOffset == 1) {
      this.setPieces(index, 'start', piece.start + 1)
      this.setPieces(index, 'len', piece.len - 1)
      return
    }

    // Case: cursor at end of piece, trim last character
    if (localOffset === piece.len) {
      this.setPieces(index, 'len', piece.len - 1)
      return
    }

    // Case: cursor mid-piece, split and drop character at (localOffset - 1)
    const right: Piece = {
      buffer: piece.buffer,
      start: piece.start + localOffset,
      len: piece.len - localOffset
    }
    this.setPieces(index, 'len', localOffset - 1)
    this.setPieces(produce((p: Piece[]) => p.splice(index + 1, 0, right)))
  }

  // Deletes the character after the cursor.
  public caretDeleteForward(offset: number): void {
    if (offset >= this.totalLength()) return
    this.rangeDelete(offset, offset + 1)
  }

  // --- Range mutations ---

  // Deletes all text in [start, end).
  public rangeDelete(start: number, end: number): void {
    // Case: empty or inverted range
    if (start >= end) return

    const {
      piece: startPiece,
      index: startIndex,
      localOffset: startLocal
    } = this.findPiece(start)
    const {
      piece: endPiece,
      index: endIndex,
      localOffset: endLocal
    } = this.findPiece(end)

    // Case: selection within a single piece
    if (startIndex === endIndex) {
      const rightLen = startPiece.len - endLocal
      if (rightLen > 0)
        this.setPieces(
          produce((p: Piece[]) =>
            p.splice(startIndex + 1, 0, {
              buffer: startPiece.buffer,
              start: startPiece.start + endLocal,
              len: rightLen
            })
          )
        )
      this.setPieces(startIndex, 'len', startLocal)
      if (startPiece.len === 0) this.removePiece(startIndex)
      return
    }

    // Case: multi-piece selection, trim edges and remove middle
    this.setPieces(startIndex, 'len', startLocal)
    this.setPieces(endIndex, 'start', endPiece.start + endLocal)
    this.setPieces(endIndex, 'len', endPiece.len - endLocal)
    this.setPieces(
      produce((p: Piece[]) => p.splice(startIndex + 1, endIndex - startIndex - 1))
    )

    // endPiece is now at startIndex + 1 after splice
    if (endPiece.len === 0) this.removePiece(startIndex + 1)
    if (startPiece.len === 0) this.removePiece(startIndex)
  }
}
