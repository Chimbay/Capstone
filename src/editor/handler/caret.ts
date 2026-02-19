import { CaretCursorHandler, CaretInputHandler } from "./types"

// Caret handlers
export const caretInputHandlers: Record<string, CaretInputHandler> = {
  insertText(block, offset, data) {
    block.pieceTable.caretInsert(offset, data)
  },
  deleteContentBackward(block, offset) {
    block.pieceTable.caretDelete(offset)
  }
}

export const caretCursorHandlers: Record<string, CaretCursorHandler> = {
  insertText(offset, data) {
    return offset + (data?.length ?? 0)
  },
  deleteContentBackward(offset) {
    return Math.max(0, offset - 1)
  }
}