import { deleteContentBackward } from './deleteContentBackward'
import { deleteContentForward } from './deleteContentForward'
import { historyRedo } from './historyRedo'
import { historyUndo } from './historyUndo'
import { insertFromPaste } from './insertFromPaste'
import { insertParagraph } from './insertParagraph'
import { insertText } from './insertText'
import { InputHandler, withHistory } from './types'

// Add new handlers here as new input types are supported.
// Wrap with withHistory to opt in to undo/redo recording.
export const handler: Record<string, InputHandler> = {
  insertText: withHistory(insertText),
  insertParagraph: withHistory(insertParagraph),
  insertFromPaste: withHistory(insertFromPaste),
  deleteContentBackward: withHistory(deleteContentBackward),
  deleteContentForward: withHistory(deleteContentForward),
  historyUndo,
  historyRedo
}

// Handles custom keys using handleKeyDown
export function handleKeys(
  e: KeyboardEvent
): { inputType: string; data?: string } | undefined {
  let inputType: string | null
  let data: string | null

  const isMod = e.ctrlKey || e.metaKey

  switch (e.key) {
    case 'Enter':
      inputType = 'insertParagraph'
      break
    case 'Backspace':
      inputType = 'deleteContentBackward'
      break
    case 'Delete':
      inputType = 'deleteContentForward'
      break
    case 'z':
      if (isMod) inputType = e.shiftKey ? 'historyRedo' : 'historyUndo'
      break
    default:
      if (e.key.length === 1 && !isMod && !e.altKey) {
        inputType = 'insertText'
        data = e.key
      }
  }

  if (!inputType) return undefined
  return { inputType, data }
}
