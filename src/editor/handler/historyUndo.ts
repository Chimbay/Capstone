import { RenderDocument } from '@editor/render'
import { CursorTarget } from '@editor/types'

// Ctrl+Z: restores previous snapshot from past stack.
export function historyUndo(editor: RenderDocument): CursorTarget | null {
  const history = editor.editHistory
  const v = history.bottom()
  if (!v) return null
  const block = editor.getDocumentBlock(v.uuid)
  if (!block) return null
  history.undo(block)
  block.pieceTable.setPieceTable(v.pieces)
  return { block, offset: v.pieces.reduce((sum, p) => sum + p.len, 0) }
}
