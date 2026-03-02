import { RenderDocument } from '@editor/render'
import { CursorTarget, SelectionNode, SelectionState } from '@editor/types'

// Cross-block delete: removes intermediate blocks, trims edges, merges boundaries.
// Only call when state.blockRange is set.
export function deleteSelection(
  editor: RenderDocument,
  state: SelectionState
): CursorTarget {
  const anchorBlock: SelectionNode = state.anchor
  const focusBlock: SelectionNode = state.focus

  const [start, end] = state.blockRange
  editor.removeBlocks(start, end)

  const anchorIdx = editor.documentBlocks.findIndex(
    b => b.uuid === anchorBlock.block.uuid
  )
  const focusIdx = editor.documentBlocks.findIndex(b => b.uuid === focusBlock.block.uuid)

  // Case: anchor before focus
  if (anchorIdx < focusIdx) {
    anchorBlock.block.pieceTable.rangeDelete(
      anchorBlock.offset,
      anchorBlock.block.pieceTable.totalLength()
    )
    focusBlock.block.pieceTable.rangeDelete(0, focusBlock.offset)
    return editor.mergeBlocks(anchorBlock.block, focusBlock.block, focusIdx)
  }
  // Case: anchor after focus
  focusBlock.block.pieceTable.rangeDelete(
    focusBlock.offset,
    focusBlock.block.pieceTable.totalLength()
  )
  anchorBlock.block.pieceTable.rangeDelete(0, anchorBlock.offset)
  return editor.mergeBlocks(focusBlock.block, anchorBlock.block, anchorIdx)
}
