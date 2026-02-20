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
    // immutable buffer holding the initial document text
    this.original = initialText
    // append-only buffer for all inserted text
    this.add = ''
    // ordered list of slices that describe the full document
    this.pieces = [{ buffer: 'Original', start: 0, len: textLength }]

    // Solid.js reactivity: track() registers a read, notify() triggers re-renders
    const [version, setVersion] = createSignal(0)
    this.track = version
    this.notify = () => setVersion(v => v + 1)
  }

  // --- Query helpers ---

  // Given a document-level offset, find which piece it falls in,
  // that piece's index in the array, and the offset within that piece.
  private findPiece(offset: number): {
    piece: Piece
    index: number
    localOffset: number
  } {
    let accumulated = 0

    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i]
      const rangeEnd = accumulated + p.len
      if (offset <= rangeEnd) {
        return { piece: p, index: i, localOffset: offset - accumulated }
      }
      accumulated += p.len
    }

    // Offset is past all pieces — clamp to end of last piece
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

  // Reconstruct the visible text by reading each piece's slice from its buffer
  public formatText(): string {
    this.track()
    return this.pieces
      .map(piece => {
        const buf = piece.buffer === 'Original' ? this.original : this.add
        return buf.substring(piece.start, piece.start + piece.len)
      })
      .join('')
  }

  public splitAt(offset: number): { left: string; right: string } {
    const full = this.formatText()
    return { left: full.substring(0, offset), right: full.substring(offset) }
  }


  // --- Caret (single cursor) mutations ---
  // Check if we can extend the last Add piece instead of creating a new one.
  // This is possible when the piece is an Add piece, it ends at the current
  // end of the add buffer, and the cursor is at the end of the piece.
  private canCoalesce(piece: Piece, localOffset: number): boolean {
    return (
      piece.buffer === 'Add' &&
      piece.start + piece.len === this.add.length &&
      localOffset === piece.len
    )
  }

  // Insert text at a document offset (single cursor, no selection)
  public caretInsert(offset: number, text: string): void {
    const { piece, index, localOffset } = this.findPiece(offset)

    if (this.canCoalesce(piece, localOffset)) {
      // Fast path: just grow the existing Add piece
      piece.len += text.length
    } else {
      // Create a new Add piece pointing to the end of the add buffer
      const inserted: Piece = {
        buffer: 'Add',
        start: this.add.length,
        len: text.length
      }

      // Inserting in the middle of a piece — split it into left + inserted + right
      if (localOffset < piece.len) {
        const right: Piece = {
          buffer: piece.buffer,
          start: piece.start + localOffset,
          len: piece.len - localOffset
        }
        this.pieces.splice(index + 1, 0, inserted, right)
      } else {
        // Inserting at the end of a piece — just append after it
        this.pieces.splice(index + 1, 0, inserted)
      }

      // Shrink the original piece to only cover the left portion
      piece.len = localOffset
    }

    this.add += text
    this.notify()
  }

  // Delete one character before the cursor (backspace)
  public caretDelete(offset: number): void {
    if (offset <= 0) return

    const { piece, index, localOffset } = this.findPiece(offset)

    if (piece.len === 1) {
      // Piece has only one char — remove it entirely
      this.removePiece(piece)
    } else if (localOffset === 0) {
      // Cursor is at the start of this piece — trim its first character
      piece.start += 1
      piece.len -= 1
    } else if (localOffset === piece.len) {
      // Cursor is at the end of this piece — trim its last character
      piece.len -= 1
    } else {
      // Cursor is in the middle — split around the deleted character
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

  // Delete one character after the cursor (delete key)
  public caretDeleteForward(offset: number): void {
    const totalLen = this.totalLength()
    if (offset >= totalLen) return
    // Reuse rangeDelete to remove the single character at offset
    this.rangeDelete(offset, offset + 1)
  }

  // Return the total character count across all pieces
  public totalLength(): number {
    return this.pieces.reduce((sum, p) => sum + p.len, 0)
  }

  // --- Range (selection) mutations ---
  // Delete all text between two document offsets
  public rangeDelete(start: number, end: number): void {
    if (start >= end) return

    const { index: startIndex, localOffset: startLocal } = this.findPiece(start)
    const { index: endIndex, localOffset: endLocal } = this.findPiece(end)

    if (startIndex === endIndex) {
      // Selection is within a single piece — split into left + right, gap is deleted
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
      // - Shrink the first piece to keep only the part before the selection
      this.pieces[startIndex].len = startLocal

      // - Shrink the last piece to keep only the part after the selection
      const endPiece = this.pieces[endIndex]
      endPiece.start += endLocal
      endPiece.len -= endLocal

      // - Remove all pieces fully inside the selection
      this.pieces.splice(startIndex + 1, endIndex - startIndex - 1)
    }

    this.removeEmptyPieces()
    this.notify()
  }
}
