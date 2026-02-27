import { RenderDocument } from '@editor/render'
import { CursorTarget, SelectionNode, SelectionState } from '@editor/types'
import { deleteSelection } from './operations'

// Handles the Delete key.
// If there is an active selection, deletes it and lands at the start.
// If the cursor is collapsed at the end of a block, merges the next block in.
// Otherwise deletes the character immediately after the cursor.
export function deleteContentForward(
  editor: RenderDocument,
  state: SelectionState
): CursorTarget {
  const anchorBlock: SelectionNode = state.anchor
  const focusBlock: SelectionNode = state.focus

  // Case: cross-block selection — delete it and land at the collapsed point
  if (state.blockRange) {
    return deleteSelection(editor, state)
  }

  // Case: same-block selection — delete the range
  if (anchorBlock.offset !== focusBlock.offset) {
    const start = Math.min(anchorBlock.offset, focusBlock.offset)
    const end = Math.max(anchorBlock.offset, focusBlock.offset)
    anchorBlock.block.pieceTable.rangeDelete(start, end)
    return { offset: start }
  }

  // Case: cursor at end of block — merge the next block in
  if (anchorBlock.offset === anchorBlock.block.pieceTable.totalLength()) {
    const idx = editor.documentBlocks.findIndex(b => b.uuid === anchorBlock.block.uuid)
    if (idx === -1 || idx === editor.documentBlocks.length - 1)
      return { offset: anchorBlock.offset }
    const belowBlock = editor.documentBlocks[idx + 1]
    return editor.mergeBlocks(belowBlock, anchorBlock.block, idx)
  }
  
  anchorBlock.block.pieceTable.caretDeleteForward(anchorBlock.offset)
  return { offset: anchorBlock.offset }
}
