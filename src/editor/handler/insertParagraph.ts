import { PieceTable } from '@editor/piece_table'
import { RenderDocument } from '@editor/render'
import { CursorTarget, ElementNode, SelectionNode, SelectionState } from '@editor/types'
import { deleteSelection } from './operations'

// Enter key: splits block at cursor, new paragraph gets the right half.
export function insertParagraph(
  editor: RenderDocument,
  state: SelectionState
): CursorTarget {
  let anchorBlock: SelectionNode = state.anchor
  let focusBlock: SelectionNode = state.focus

  // Case: cross-block selection — collapse it first, then split from the result
  if (state.blockRange) {
    const { block, offset } = deleteSelection(editor, state)
    anchorBlock = { block: block, offset }
    focusBlock = { block: block, offset }
  }

  // Case: same-block selection — collapse it before splitting
  const start = Math.min(anchorBlock.offset, focusBlock.offset)
  const end = Math.max(anchorBlock.offset, focusBlock.offset)
  if (anchorBlock.offset !== focusBlock.offset) {
    anchorBlock.block.pieceTable.rangeDelete(start, end)
  }

  // Truncate at cursor, right half goes to new block.
  const rightPieces = anchorBlock.block.pieceTable.splitPieces(start)

  const newBlock: ElementNode = {
    uuid: crypto.randomUUID(),
    tag: 'p',
    pieceTable: new PieceTable(editor.buffer, rightPieces)
  }

  const idx = editor.documentBlocks.findIndex(b => b.uuid === anchorBlock.block.uuid)
  editor.addBlock(newBlock, idx)

  return { block: newBlock, offset: 0 }
}
