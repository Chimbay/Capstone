import { deleteContentBackward } from './deleteContentBackward'
import { deleteContentForward } from './deleteContentForward'
import { insertParagraph } from './insertParagraph'
import { insertText } from './insertText'
import { InputHandler } from './types'

// Maps InputEvent.inputType strings to their handler functions.
// Add new handlers here as new input types are supported.
export const handler: Record<string, InputHandler> = {
  insertText,
  insertParagraph,
  deleteContentBackward,
  deleteContentForward
}
