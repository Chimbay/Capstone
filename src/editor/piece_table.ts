import { createSignal } from 'solid-js'
import { DocumentBuffer } from './buffer'
import { Piece } from './types'

// PieceTable represents the text content of a single block.
// It stores an ordered list of Pieces — each a (buffer, start, len) slice —
// that together form the block's logical text when concatenated.
//
// All blocks in a document share one DocumentBuffer, so pieces can be moved
// between blocks (e.g. on Enter/Backspace) without copying text.
//
// Solid reactivity is handled internally: formatText() registers a read
// dependency, and every mutation calls notify() to trigger re-renders.
export class PieceTable {
  buffer: DocumentBuffer
  pieces: Piece[]
  private notify: () => void
  private track: () => void

  constructor(buffer: DocumentBuffer, pieces: Piece[]) {
    this.buffer = buffer
    this.pieces = pieces

    // Solid signal: track() registers a read, notify() triggers re-renders
    const [version, setVersion] = createSignal(0)
    this.track = version
    this.notify = () => setVersion(v => v + 1)
  }

  // --- Helpers ---

  // Walk the piece list to find which piece owns the given document offset.
  // Returns the piece, its index, and how many chars into the piece offset falls.
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

    // Offset is past the end — clamp to the last piece
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

  // --- Read ---

  // Reconstruct the visible text by reading each piece's slice from its buffer.
  // Calling track() inside registers a Solid reactive dependency so any
  // component reading formatText() re-renders when notify() fires.
  public formatText(): string {
    this.track()
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

  // --- Split ---

  // Splits this piece table at a document offset for a block split (Enter key).
  // Truncates this table to everything before the offset, and returns the
  // pieces representing everything after — ready to hand to a new PieceTable.
  // Both halves keep referencing the same shared DocumentBuffer.
  public splitPieces(offset: number): Piece[] {
    const { piece, index, localOffset } = this.findPiece(offset)
    const rightPieces: Piece[] = []

    if (localOffset > 0 && localOffset < piece.len) {
      // Cursor is mid-piece — the piece must be split in two
      rightPieces.push({
        buffer: piece.buffer,
        start: piece.start + localOffset,
        len: piece.len - localOffset
      })
      piece.len = localOffset
      rightPieces.push(...this.pieces.splice(index + 1))
    } else if (localOffset === 0) {
      // Cursor is at the start of this piece — entire piece goes to the right block
      rightPieces.push(...this.pieces.splice(index))
    } else {
      // Cursor is at the end of this piece — everything after goes to the right block
      rightPieces.push(...this.pieces.splice(index + 1))
    }

    this.notify()
    return rightPieces
  }

  // --- Caret mutations ---

  // Returns true when we can grow the last Add piece in place instead of
  // creating a new one. Requires the cursor to be at the end of an Add piece
  // that ends exactly at the current tip of the add buffer.
  private canCoalesce(piece: Piece, localOffset: number): boolean {
    return (
      piece.buffer === 'Add' &&
      piece.start + piece.len === this.buffer.add.length &&
      localOffset === piece.len
    )
  }

  // Insert text at a document offset (caret, no selection).
  public caretInsert(offset: number, text: string): void {
    const { piece, index, localOffset } = this.findPiece(offset)

    if (this.canCoalesce(piece, localOffset)) {
      // Fast path: just grow the existing Add piece
      piece.len += text.length
    } else {
      // New Add piece pointing to the end of the add buffer
      const inserted: Piece = {
        buffer: 'Add',
        start: this.buffer.add.length,
        len: text.length
      }

      if (localOffset < piece.len) {
        // Inserting mid-piece — split into [left, inserted, right]
        const right: Piece = {
          buffer: piece.buffer,
          start: piece.start + localOffset,
          len: piece.len - localOffset
        }
        this.pieces.splice(index + 1, 0, inserted, right)
      } else {
        // Inserting at the end of a piece — append after it
        this.pieces.splice(index + 1, 0, inserted)
      }

      piece.len = localOffset
    }

    this.buffer.add += text
    this.notify()
  }

  // Delete the character immediately before the cursor (Backspace).
  public caretDelete(offset: number): void {
    if (offset <= 0) return

    const { piece, index, localOffset } = this.findPiece(offset)

    if (piece.len === 1) {
      // Single-char piece — remove it entirely
      this.removePiece(piece)
    } else if (localOffset === piece.len) {
      // Cursor is at the end of the piece — trim its last character
      piece.len -= 1
    } else {
      // Cursor is mid-piece — split, dropping the character at (localOffset - 1)
      const right: Piece = {
        buffer: piece.buffer,
        start: piece.start + localOffset, // char at localOffset survives
        len: piece.len - localOffset
      }
      piece.len = localOffset - 1 // chars before the deleted one
      this.pieces.splice(index + 1, 0, right)
    }

    this.notify()
  }

  // Delete the character immediately after the cursor (Delete key).
  public caretDeleteForward(offset: number): void {
    if (offset >= this.totalLength()) return
    this.rangeDelete(offset, offset + 1)
  }

  // --- Range mutations ---

  // Delete all text in [start, end).
  public rangeDelete(start: number, end: number): void {
    if (start >= end) return

    const { index: startIndex, localOffset: startLocal } = this.findPiece(start)
    const { index: endIndex, localOffset: endLocal } = this.findPiece(end)

    if (startIndex === endIndex) {
      // Selection is within a single piece — keep left, skip deleted, keep right
      const piece = this.pieces[startIndex]
      const right: Piece = {
        buffer: piece.buffer,
        start: piece.start + endLocal,
        len: piece.len - endLocal
      }
      piece.len = startLocal
      this.pieces.splice(startIndex + 1, 0, right)
    } else {
      // Selection spans multiple pieces:
      // trim the first piece to the part before the selection
      this.pieces[startIndex].len = startLocal

      // trim the last piece to the part after the selection
      const endPiece = this.pieces[endIndex]
      endPiece.start += endLocal
      endPiece.len -= endLocal

      // remove all pieces fully inside the selection
      this.pieces.splice(startIndex + 1, endIndex - startIndex - 1)
    }

    this.removeEmptyPieces()
    this.notify()
  }
}
