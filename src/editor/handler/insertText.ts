import { RenderDocument } from '@editor/render'
import { CursorTarget, SelectionNode, SelectionState } from '@editor/types'
import { deleteSelection } from './operations'

// Typing: deletes selection if active, then inserts at caret.
export function insertText(
  editor: RenderDocument,
  state: SelectionState,
  data?: string
): CursorTarget {
  let anchorBlock: SelectionNode = state.anchor
  let focusBlock: SelectionNode = state.focus

  // Case: cross-block selection — collapse it first, then insert into the result
  if (state.blockRange) {
    const { block, offset } = deleteSelection(editor, state)
    anchorBlock = { block: block, offset }
    focusBlock = { block: block, offset }
  }

  if (!data) return { block: anchorBlock.block, offset: anchorBlock.offset }

  // Case: same-block selection — delete it before inserting
  const start = Math.min(anchorBlock.offset, focusBlock.offset)
  let end = Math.max(anchorBlock.offset, focusBlock.offset)
  if (start !== end) {
    anchorBlock.block.pieceTable.rangeDelete(start, end)
    end = start
  }

  anchorBlock.block.pieceTable.caretInsert(start, data)

  return { block: anchorBlock.block, offset: start + data.length }
}
