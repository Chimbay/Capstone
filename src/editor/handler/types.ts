import { RenderDocument } from '@editor/render'
import { CursorTarget, SelectionState } from '@editor/types'

// All handlers: mutate document, return cursor target.
export type InputHandler = (
  editor: RenderDocument,
  state: SelectionState,
  data?: string
) => CursorTarget

// Wraps a handler to capture a full-doc snapshot before it runs.
export function withHistory(fn: InputHandler): InputHandler {
  return (editor, state, data) => {
    editor.editHistory.insert(editor.captureFullDoc())
    return fn(editor, state, data)
  }
}
