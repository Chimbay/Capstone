import { RenderDocument } from '@editor/render'
import { CursorTarget } from '@editor/types'

// Ctrl+Z: restores previous snapshot from past stack.
export function historyUndo(editor: RenderDocument): CursorTarget | null {
  const current = editor.captureFullDoc()
  const v = editor.editHistory.undo(current)
  if (!v) return null
  editor.restoreSnapshot(v)
  const block = editor.getDocumentBlock(v.cursor.uuid)
  if (!block) return null
  return { block, offset: v.cursor.offset }
}
