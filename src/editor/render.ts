import { parseBlock } from './parser/parse'
import { DomNode, ElementNode } from './types'

export class RenderDocument {
  documentBlocks: ElementNode[]

  public constructor(document: string) {
    const splits = document.split('\n')
    this.documentBlocks = splits.map(s => parseBlock(s))
  }
  public renderText(): DomNode[] {
    return this.documentBlocks.map(block => ({
      tag: block.tag,
      content: block.pieceTable.formatText()
    }))
  }
}
