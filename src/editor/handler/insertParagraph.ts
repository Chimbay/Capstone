import { PieceTable } from '@editor/piece_table'
import { RenderDocument } from '@editor/render'
import { CursorTarget, ElementNode } from '@editor/types'

// Handles the Enter key — splits the current block into two.
// The left half stays in the existing block (its piece list is truncated in
// place by splitPieces). The right half goes to a new paragraph block that
// shares the same DocumentBuffer, so no text is copied.
// Returns a CursorTarget pointing to the start of the new block.
export function insertParagraph(
  editor: RenderDocument,
  block: ElementNode,
  start: number,
  end: number
): CursorTarget {
  // Collapse any selection before splitting
  if (start !== end) block.pieceTable.rangeDelete(start, end)

  // splitPieces truncates this block's pieces at `start` and returns the right half
  const rightPieces = block.pieceTable.splitPieces(start)
  
  const newBlock: ElementNode = {
    uuid: crypto.randomUUID(),
    tag: 'p',
    pieceTable: new PieceTable(editor.buffer, rightPieces)
  }

  editor.blockMap.set(newBlock.uuid, newBlock)

  const idx = editor.documentBlocks.findIndex(b => b.uuid === block.uuid)
  editor.setDocumentBlocks(blocks => {
    blocks.splice(idx + 1, 0, newBlock)
  })

  return { blockId: newBlock.uuid, offset: 0 }
}
