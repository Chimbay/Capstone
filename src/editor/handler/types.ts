import { RenderDocument } from '@editor/render'
import { CursorTarget, SelectionState } from '@editor/types'

// All input handlers share this signature.
// They mutate the document and return where the cursor should land.
// Same-block handlers omit blockId; block-level handlers (split, merge) set it.
export type InputHandler = (
  editor: RenderDocument,
  state: SelectionState,
  data?: string
) => CursorTarget
