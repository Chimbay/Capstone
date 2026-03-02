import { RenderDocument } from '@editor/render'
import { CursorTarget, SelectionNode, SelectionState } from '@editor/types'
import { deleteSelection } from './operations'

// Delete key: deletes selection or character after cursor.
export function deleteContentForward(
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

  // Case: cursor at block end, merge next block in
  if (anchorBlock.offset === anchorBlock.block.pieceTable.totalLength()) {
    const idx = editor.documentBlocks.findIndex(b => b.uuid === anchorBlock.block.uuid)
    if (idx === -1 || idx === editor.documentBlocks.length - 1)
      return { offset: anchorBlock.offset }
    const belowBlock = editor.documentBlocks[idx + 1]
    return editor.mergeBlocks(anchorBlock.block, belowBlock, idx + 1)
  }

  anchorBlock.block.pieceTable.caretDeleteForward(anchorBlock.offset)
  return { offset: anchorBlock.offset }
}
