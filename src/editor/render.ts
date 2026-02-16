import { parseBlock } from './parser/parse'
import { CursorHandler, DocumentPosition, ElementNode, InputHandler } from './types'

const inputHandlers: Record<string, InputHandler> = {
  insertText(block, offset, data) {
    block.pieceTable.caretInsert(offset, data)
  },
  deleteContentBackward(block, offset) {
    block.pieceTable.caretDelete(offset)
  }
}
const cursorHandlers: Record<string, CursorHandler> = {
  insertText(offset, data) {
    return offset + (data?.length ?? 0)
  },
  deleteContentBackward(offset) {
    return Math.max(0, offset - 1)
  }
}

export class RenderDocument {
  blockMap: Map<string, ElementNode>
  documentPosition: DocumentPosition
  documentBlocks: ElementNode[]

  public constructor(document: string) {
    const splits = document.split('\n')

    this.blockMap = new Map()
    this.documentPosition = { position: 0, node: null }
    this.documentBlocks = splits.map(s => {
      const block: ElementNode = parseBlock(s)
      this.blockMap.set(block.uuid, block)
      return block
    })
  }

  public setDocumentPosition(block: ElementNode, pos: number): void {
    this.documentPosition = { position: pos, node: block }
  }

  public getDocumentBlocks(): ElementNode[] {
    return this.documentBlocks
  }

  public handleInput(input: InputEvent): void {
    const { node, position } = this.documentPosition
    const handler = inputHandlers[input.inputType]
    handler(node, position, input.data ?? undefined)
  }
  
  public handleCursor(input: InputEvent): number {
    const { position } = this.documentPosition
    const handler = cursorHandlers[input.inputType]
    if (!handler) return position
    return handler(position, input.data ?? undefined)
  }
}
