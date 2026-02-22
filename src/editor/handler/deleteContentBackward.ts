import { RenderDocument } from '@editor/render'
import { CursorTarget, ElementNode } from '@editor/types'

// Handles the Backspace key.
// If there is an active selection, deletes it and lands at the start.
// If the cursor is collapsed, deletes the character immediately before it.
export function deleteContentBackward(
  editor: RenderDocument,
  block: ElementNode,
  start: number,
  end: number
): CursorTarget {
  const mergeAbove = () => {
    const idx = editor.documentBlocks.findIndex(b => b.uuid === block.uuid)
    if (idx <= 0) return { offset: 0 }
    const aboveBlock = editor.documentBlocks[idx - 1]
    const joinOffset = aboveBlock.pieceTable.totalLength()
    aboveBlock.pieceTable.append(block.pieceTable)
    editor.blockMap.delete(block.uuid)
    editor.setDocumentBlocks(blocks => blocks.splice(idx, 1))
    return { blockId: aboveBlock.uuid, offset: joinOffset }
  }

  if (start !== end) {
    block.pieceTable.rangeDelete(start, end)
    return { offset: start }
  }
  // Case: cursor at start of block — merge into the block above
  if (start === 0) {
    mergeAbove()
  }

  block.pieceTable.caretDelete(start)
  return { offset: Math.max(0, start - 1) }
}
