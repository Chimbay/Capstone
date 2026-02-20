import { deleteContentBackward } from './deleteContentBackward'
import { insertParagraph } from './insertParagraph'
import { insertText } from './insertText'
import { InputHandler } from './types'

export const handler: Record<string, InputHandler> = {
  insertText: insertText,
  insertParagraph: insertParagraph,
  deleteContentBackward: deleteContentBackward
}
