import { RenderDocument } from '@editor/render'
import { CursorTarget, ElementNode } from '@editor/types'

// Handles typing a character (or pasting a single line of text).
// If there is an active selection it is deleted first, then the text is inserted.
export function insertText(
  _editor: RenderDocument,
  block: ElementNode,
  start: number,
  end: number,
  data?: string
): CursorTarget {
  if (!data) return { offset: start }

  if (start !== end) {
    block.pieceTable.rangeDelete(start, end)
    end = start
  }

  block.pieceTable.caretInsert(start, data)
  return { offset: start + data.length }
}
