import { RenderDocument } from '@editor/render'
import { CursorTarget } from '@editor/types'

// Ctrl+Shift+Z: restores next snapshot from future stack.
export function historyRedo(editor: RenderDocument): CursorTarget | null {
  const current = editor.captureFullDoc()
  const v = editor.editHistory.redo(current)
  if (!v) return null
  editor.restoreSnapshot(v)
  const block = editor.getDocumentBlock(v.cursor.uuid)
  if (!block) return null
  return { block, offset: v.cursor.offset }
}
