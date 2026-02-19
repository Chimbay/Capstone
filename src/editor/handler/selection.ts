import { SelectionCursorHandler, SelectionInputHandler } from './types'

// Selection handlers
export const selectionInputHandlers: Record<string, SelectionInputHandler> = {
  insertText(block, start, end, data) {
    block.pieceTable.rangeDelete(start, end)
    block.pieceTable.caretInsert(start, data)
  },
  deleteContentBackward(block, start, end) {
    block.pieceTable.rangeDelete(start, end)
  }
}
export const selectionCursorHandlers: Record<string, SelectionCursorHandler> = {
  insertText(start, _end, data) {
    return start + (data?.length ?? 0)
  },
  deleteContentBackward(start) {
    return start
  }
}
