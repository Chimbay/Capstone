import { RenderDocument } from '@editor/render'
import { CursorTarget, SelectionNode, SelectionState } from '@editor/types'
import { deleteSelection } from './operations'

// Handles the Backspace key.
// If there is an active selection, deletes it and lands at the start.
// If the cursor is collapsed, deletes the character immediately before it.
export function deleteContentBackward(
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

  // Case: cursor at start of block — merge into the block above
  if (anchorBlock.offset === 0) {
    const idx = editor.documentBlocks.findIndex(b => b.uuid === anchorBlock.block.uuid)
    if (idx <= 0) return { offset: 0 }
    const aboveBlock = editor.documentBlocks[idx - 1]

    return editor.mergeBlocks(aboveBlock, anchorBlock.block, idx)
  }

  anchorBlock.block.pieceTable.caretDelete(anchorBlock.offset)
  return { offset: Math.max(0, anchorBlock.offset - 1) }
}
