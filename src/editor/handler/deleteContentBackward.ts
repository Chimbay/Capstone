import { RenderDocument } from '@editor/render'
import { ElementNode } from '@editor/types'

export function deleteContentBackward(
  _editor: RenderDocument,
  block: ElementNode,
  start: number,
  end: number
) {
  if (start !== end) {
    block.pieceTable.rangeDelete(start, end)
    return { offset: start }
  }

  block.pieceTable.caretDelete(start)
  return { offset: Math.max(0, start - 1) }
}
