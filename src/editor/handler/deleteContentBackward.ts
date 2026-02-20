import { RenderDocument } from '@editor/render'
import { CursorTarget, ElementNode } from '@editor/types'

// Handles the Backspace key.
// If there is an active selection, deletes it and lands at the start.
// If the cursor is collapsed, deletes the character immediately before it.
export function deleteContentBackward(
  _editor: RenderDocument,
  block: ElementNode,
  start: number,
  end: number
): CursorTarget {
  if (start !== end) {
    block.pieceTable.rangeDelete(start, end)
    return { offset: start }
  }

  block.pieceTable.caretDelete(start)
  return { offset: Math.max(0, start - 1) }
}
