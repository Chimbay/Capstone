import { RenderDocument } from '@editor/render'
import { CursorTarget, ElementNode } from '@editor/types'

// Handles the Delete key.
// If there is an active selection, deletes it and lands at the start.
// If the cursor is collapsed at the end of a block, merges the next block in.
// Otherwise deletes the character immediately after the cursor.
export function deleteContentForward(
  editor: RenderDocument,
  block: ElementNode,
  start: number,
  end: number
): CursorTarget {
  if (start !== end) {
    block.pieceTable.rangeDelete(start, end)
    return { offset: start }
  }

  // Case: cursor at end of block — merge the next block in
  if (start === block.pieceTable.totalLength()) {
    const idx = editor.documentBlocks.findIndex(b => b.uuid === block.uuid)
    if (idx === -1 || idx === editor.documentBlocks.length - 1) return { offset: start }
    const belowBlock = editor.documentBlocks[idx + 1]
    block.pieceTable.append(belowBlock.pieceTable)
    editor.blockMap.delete(belowBlock.uuid)
    editor.setDocumentBlocks(blocks => blocks.splice(idx + 1, 1))
    return { offset: start }
  }

  block.pieceTable.caretDeleteForward(start)
  return { offset: start }
}
