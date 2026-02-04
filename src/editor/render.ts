import { parseBlock } from './parser/parse'
import { ElementNode } from './types'

interface DocumentPosition {
  position: number
  node: ElementNode | null
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
  public handleInput(type: InputEvent): void {
    switch (type.inputType) {
      case 'insertText':
        this.documentPosition.node.pieceTable.insert(
          this.documentPosition.position,
          type.data
        )
        break
      default:
        break
    }
  }
}
