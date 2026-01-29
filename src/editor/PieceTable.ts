import markdownit, { Token } from 'markdown-it'
import type { Piece } from './types'

export class PieceTable {
  private original: Token[]
  private add: string | null
  private pieces: Piece[]
  private cursorPosition: number | null

  private ParseDocument(document: string) {
    const md: markdownit = markdownit()
    return md.parse(document, {})
  }

  public constructor(document: string) {
    this.original = this.ParseDocument(document)
    this.add = null
    this.pieces = [{ buffer: 'Original', start: 0, len: document.length }]
    this.cursorPosition = null
  }

  private findPieceAtPosition(): { pieceIndex: number; offset: number } | null {
    let accumulated = 0

    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i]

      if (accumulated + piece.len > this.cursorPosition) {
        return {
          pieceIndex: i,
          offset: this.cursorPosition - accumulated
        }
      }

      accumulated += piece.len
    }
  }

  private insertText(text: string) {
    const addStart = this.add?.length ?? 0
    this.add = (this.add ?? '') + text

    const newPiece: Piece = {
      buffer: 'Add',
      start: addStart,
      len: text.length
    }

    const location = this.findPieceAtPosition()

    if (location === null) {
      this.pieces.push(newPiece)
    } else {
      const { pieceIndex, offset } = location
      const target = this.pieces[pieceIndex]

      const left: Piece = {
        buffer: target.buffer,
        start: target.start,
        len: offset
      }
      const right: Piece = {
        buffer: target.buffer,
        start: target.start + offset,
        len: target.len - offset
      }

      this.pieces.splice(pieceIndex, 1, left, newPiece, right)
    }
  }
  private handleParagraph() {}

  public handleStroke(e: InputEvent) {
    switch (e.inputType) {
      case 'insertText':
        this.insertText(e.data)
        break
      case 'insertParagraph':
        this.handleParagraph()
        break
      default:
        break
    }
  }

  public setCursor(pos: number) {
    this.cursorPosition = pos
  }

  public renderDocument(): Token[] {
    return this.original
  }
  public getPieces(): Piece[] {
    return this.pieces
  }

  // For debug purposes
  public getTable() {
    return {
      original: this.original,
      add: this.add,
      pieces: this.pieces
    }
  }
}
