import { RenderDocument } from '@editor/render'
import { CursorTarget, SelectionState } from '@editor/types'

// All handlers: mutate document, return cursor target.
export type InputHandler = (
  editor: RenderDocument,
  state: SelectionState,
  data?: string
) => CursorTarget
