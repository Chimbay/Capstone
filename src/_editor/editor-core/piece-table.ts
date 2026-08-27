import { DocumentBuffer } from './document-buffer'
import { Piece } from './type'

export class PieceTable {
  buffer: DocumentBuffer
  /* @internal */
  private __pieces: Piece[]

  constructor(buffer: DocumentBuffer, initialPieces: Piece[]) {
    this.buffer = buffer
    this.__pieces = initialPieces
  }

  // --- Read ---
  /*
   * Reconstructs visible text from all pieces
   */
  public formatText(): string {
    return this.__pieces
      .map(p => {
        const buf = p.buffer === 'Original' ? this.buffer.original : this.buffer.add
        return buf.substring(p.start, p.start + p.len)
      })
      .join('')
  }
  /*
   * Returns the total length of the table (summation of piece table)
   */
  public totalLength(): number {
    return this.__pieces.reduce((sum, p) => sum + p.len, 0)
  }
  /*
   * Returns the pieces of the table
   */
  public getTable(): Piece[] {
    return this.__pieces
  }
  // --- Table mutations ---
  /*
   * Splits the table at an offset. Left half remains, remainder returns
   * @param offset - The offset related in the table
   */
  public splitTable(offset: number): Piece[] {
    // Case: empty table
    if (this.__pieces.length === 0) return []

    const { piece, index, localOffset } = this.__findPiece(offset)

    // Case: cursor is mid-piece, split the piece into two, then return table
    if (localOffset > 0 && localOffset < piece.len) {
      const rightHalf: Piece = {
        buffer: piece.buffer,
        start: piece.start + localOffset,
        len: piece.len - localOffset
      }
      const rest = this.__pieces.slice(index + 1)
      this.__pieces[index].len = localOffset
      this.__pieces.splice(index + 1)
      return [rightHalf, ...rest]
    }
    // Case: cursor at the start of a piece, entire right table returns (including the current piece)
    if (localOffset === 0) {
      const rest = this.__pieces.slice(index)
      this.__pieces.splice(index)
      return rest
    }
    // Case: cursor at the end of a piece, entire right table returns
    const rest = this.__pieces.slice(index + 1)
    this.__pieces.splice(index + 1)
    return rest
  }
  /*
   * Appends pieces from another table, array, or single piece.
   * @param arg - Piecetable, an array, or a piece
   */
  public append(arg: Piece): void {
    const incoming =
      arg instanceof PieceTable ? arg.__pieces : Array.isArray(arg) ? arg : [arg]

    this.__pieces.push(...incoming)
  }
  /*
   * Completely rewrites the piece table
   * @param pieces - Pieces that replace the pieces in regard of the table
   */
  public setPieceTable(pieces: Piece[]): void {
    this.__pieces = pieces
  }
  // --- Caret mutations ---
  /*
   * Inserts text at an offset
   * @param offset - The offset related in the table
   * @param text - Text that is being inserted
   */
  public caretInsert(offset: number, text: string): void {
    // Case: Empty block, create the first piece
    if (this.__pieces.length === 0) {
      const p: Piece = {
        buffer: 'Add',
        start: this.buffer.add.length,
        len: text.length
      }
      this.buffer.add += text
      this.append(p)
      return
    }

    const addStart = this.buffer.add.length
    const { piece, index, localOffset } = this.__findPiece(offset)
    // Case: Can coalesce; grow existing Add piece in place
    if (this.canCoalesce(piece, localOffset, addStart)) {
      this.buffer.add += text
      this.__pieces[index].len = piece.len + text.length
      return
    }

    const inserted: Piece = { buffer: 'Add', start: addStart, len: text.length }
    this.buffer.add += text
    // Case: Mid-piece, split into [left, inserted, right]
    if (localOffset < piece.len) {
      const right: Piece = {
        buffer: piece.buffer,
        start: piece.start + localOffset,
        len: piece.len - localOffset
      }
      this.__pieces.splice(index + 1, 0, inserted, right)
    } else {
      // Case: end of piece, append after it
      this.__pieces.splice(index + 1, 0, inserted)
    }

    this.__pieces[index].len = localOffset
  }
  /*
   * Deletes text at an offst.
   * @param offset - The offset related to the table.
   */
  public caretDelete(offset: number): void {
    // Case: The start of a block (Handled outside of the table)
    if (offset <= 0) return
    // Case: Out of bounds (deleting forward)
    if (offset > this.totalLength()) return

    const { piece, index, localOffset } = this.__findPiece(offset)

    // Case: Single-char piece, removes entirely
    if (piece.len === 1) {
      this.__removePiece(index)
      return
    }
    // Case: Deleting the first character
    if (localOffset == 1) {
      this.__pieces[index].start = piece.start + 1
      this.__pieces[index].len = piece.len - 1
      return
    }
    // Case: Cursor at end of piece, trims last character.
    if (localOffset === piece.len) {
      this.__pieces[index].len = piece.len - 1
      return
    }

    const right: Piece = {
      buffer: piece.buffer,
      start: piece.start + localOffset,
      len: piece.len - localOffset
    }
    this.__pieces[index].len = localOffset - 1
    this.__pieces.splice(index + 1, 0, right)
  }
  // --- Range mutations ---
  /*
   * Deletes text in a range [start, end].
   * @param offset - The offset related in the table
   * @param end - An offset that states the end of the range
   *
   */
  public rangeDelete(start: number, end: number): void {
    // Case: empty or inverted range
    if (start >= end) return

    const {
      piece: startPiece,
      index: startIndex,
      localOffset: startLocal
    } = this.__findPiece(start)
    const {
      piece: endPiece,
      index: endIndex,
      localOffset: endLocal
    } = this.__findPiece(end)
    // Case: Range within a single piece
    if (startIndex === endIndex) {
      const rightLen = startPiece.len - endLocal
      if (rightLen > 0)
        this.__pieces.splice(startIndex + 1, 0, {
          buffer: startPiece.buffer,
          start: startPiece.start + endLocal,
          len: rightLen
        })
      this.__pieces[startIndex].len = startLocal

      if (startPiece.len === 0) this.__removePiece(startIndex)
      return
    }

    this.__pieces[startIndex].len = startLocal
    this.__pieces[endIndex].start = endPiece.start + endLocal
    this.__pieces[endIndex].len = endPiece.len - endLocal
    this.__pieces.splice(startIndex + 1, endIndex - startIndex - 1)

    // endPiece is now at startIndex + 1 after splice
    if (endPiece.len === 0) this.__removePiece(startIndex + 1)
    if (startPiece.len === 0) this.__removePiece(startIndex)
  }

  /* @internal */
  // --- Helpers ---
  // Finds the piece at a document offset, returns piece, their index, and the local offset within the table.
  private __findPiece(offset: number): {
    piece: Piece
    index: number
    localOffset: number
  } {
    let accmulated = 0
    for (let i = 0; i < this.__pieces.length; i++) {
      const p = this.__pieces[i]
      if (offset <= accmulated + p.len) {
        return { piece: p, index: i, localOffset: offset - accmulated }
      }
      accmulated += p.len
    }

    // Case: offset past end, clamp to last piece
    const last = this.__pieces.length - 1
    return {
      piece: this.__pieces[last],
      index: last,
      localOffset: this.__pieces[last].len
    }
  }
  private __removePiece(index: number): void {
    this.__pieces.splice(index, 1)
  }
  // --- Caret mutations ---
  // True if the next insert can extend the last Add piece in place
  private canCoalesce(piece: Piece, localOffset: number, addStart: number): boolean {
    return (
      piece.buffer === 'Add' &&
      piece.start + piece.len === addStart &&
      localOffset === piece.len
    )
  }
}
