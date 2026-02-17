import { parseBlock } from './parser/parse'
import {
  CaretCursorHandler,
  CaretInputHandler,
  ElementNode,
  SelectionCursorHandler,
  SelectionInputHandler,
  SelectionState
} from './types'

// Caret handlers
const caretInputHandlers: Record<string, CaretInputHandler> = {
  insertText(block, offset, data) {
    block.pieceTable.caretInsert(offset, data)
  },
  deleteContentBackward(block, offset) {
    block.pieceTable.caretDelete(offset)
  }
}
const caretCursorHandlers: Record<string, CaretCursorHandler> = {
  insertText(offset, data) {
    return offset + (data?.length ?? 0)
  },
  deleteContentBackward(offset) {
    return Math.max(0, offset - 1)
  }
}

// Selection handlers
const selectionInputHandlers: Record<string, SelectionInputHandler> = {
  insertText(block, start, end, data) {
    block.pieceTable.rangeDelete(start, end)
    block.pieceTable.caretInsert(start, data)
  },
  deleteContentBackward(block, start, end) {
    block.pieceTable.rangeDelete(start, end)
  }
}
const selectionCursorHandlers: Record<string, SelectionCursorHandler> = {
  insertText(start, _end, data) {
    return start + (data?.length ?? 0)
  },
  deleteContentBackward(start) {
    return start
  }
}

// Document
export class RenderDocument {
  blockMap: Map<string, ElementNode>
  selectionState: SelectionState
  documentBlocks: ElementNode[]

  public constructor(document: string) {
    const splits = document.split('\n')

    this.blockMap = new Map()
    this.selectionState = { collapsed: true, start: 0, end: 0, node: null }
    this.documentBlocks = splits.map(s => {
      const block: ElementNode = parseBlock(s)
      this.blockMap.set(block.uuid, block)
      return block
    })
  }

  // Accessors
  public getDocumentBlocks(): ElementNode[] {
    return this.documentBlocks
  }

  public setSelectionState(
    collapsed: boolean,
    block: ElementNode,
    start: number,
    end: number
  ): void {
    this.selectionState = { collapsed, node: block, start, end }
  }

  // Input dispatch

  public handleInput(input: InputEvent): void {
    const { collapsed, node, start, end } = this.selectionState
    if (!node) return

    if (collapsed) {
      const handler = caretInputHandlers[input.inputType]
      if (handler) handler(node, start, input.data ?? undefined)
    } else {
      const handler = selectionInputHandlers[input.inputType]
      if (handler) handler(node, start, end, input.data ?? undefined)
    }
  }

  // Cursor dispatch

  public computeCursorOffset(input: InputEvent): number {
    const { collapsed, start, end } = this.selectionState

    if (collapsed) {
      const handler = caretCursorHandlers[input.inputType]
      if (!handler) return start
      return handler(start, input.data ?? undefined)
    } else {
      const handler = selectionCursorHandlers[input.inputType]
      if (!handler) return start
      return handler(start, end, input.data ?? undefined)
    }
  }
}
