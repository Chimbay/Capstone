import { RenderDocument } from '@editor/render'
import { CursorTarget } from '@editor/types'

// Ctrl+Shift+Z: restores next snapshot from future stack.
export function historyRedo(editor: RenderDocument): CursorTarget {
  const history = editor.editHistory
  const v = history.top()
  if (!v) return undefined
  const { uuid, pieces } = v
  const block = editor.getDocumentBlock(uuid)
  if (block) {
    history.redo()
    block.pieceTable.setPieceTable(pieces)
  }
  return { block: block ?? undefined, offset: pieces.reduce((sum, p) => sum + p.len, 0) }
}
