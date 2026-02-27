import { PieceTable } from '@editor/piece_table'
import { RenderDocument } from '@editor/render'
import { CursorTarget, ElementNode, SelectionNode, SelectionState } from '@editor/types'
import { deleteSelection } from './operations'

// Handles the Enter key — splits the current block into two.
// The left half stays in the existing block (its piece list is truncated in
// place by splitPieces). The right half goes to a new paragraph block that
// shares the same DocumentBuffer, so no text is copied.
// Returns a CursorTarget pointing to the start of the new block.
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

  // splitPieces truncates this block's pieces at `start` and returns the right half
  const rightPieces = anchorBlock.block.pieceTable.splitPieces(start)

  const newBlock: ElementNode = {
    uuid: crypto.randomUUID(),
    tag: 'p',
    pieceTable: new PieceTable(editor.buffer, rightPieces)
  }

  editor.blockMap.set(newBlock.uuid, newBlock)

  const idx = editor.documentBlocks.findIndex(b => b.uuid === anchorBlock.block.uuid)
  editor.setDocumentBlocks(blocks => {
    blocks.splice(idx + 1, 0, newBlock)
  })

  return { block: newBlock, offset: 0 }
}
