import { RenderDocument } from '@editor/render'
import { CursorTarget, SelectionNode, SelectionState } from '@editor/types'
import { deleteSelection } from './operations'

// Backspace: deletes selection or character before cursor.
export function deleteContentBackward(
  editor: RenderDocument,
  state: SelectionState
): CursorTarget {
  const anchorBlock: SelectionNode = state.anchor
  const focusBlock: SelectionNode = state.focus

  // Case: cross-block selection
  if (state.blockRange) {
    return deleteSelection(editor, state)
  }

  // Case: same-block selection
  if (anchorBlock.offset !== focusBlock.offset) {
    const start = Math.min(anchorBlock.offset, focusBlock.offset)
    const end = Math.max(anchorBlock.offset, focusBlock.offset)
    anchorBlock.block.pieceTable.rangeDelete(start, end)
    return { offset: start }
  }

  // Case: cursor at block start, merge into block above
  if (anchorBlock.offset === 0) {
    const idx = editor.documentBlocks.findIndex(b => b.uuid === anchorBlock.block.uuid)
    if (idx <= 0) return { offset: 0 }
    const aboveBlock = editor.documentBlocks[idx - 1]

    return editor.mergeBlocks(aboveBlock, anchorBlock.block, idx)
  }

  anchorBlock.block.pieceTable.caretDelete(anchorBlock.offset)
  return { offset: Math.max(0, anchorBlock.offset - 1) }
}
