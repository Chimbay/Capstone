import { RenderDocument } from '@editor/render'
import { ElementNode } from '@editor/types'

export function insertText(
  _editor: RenderDocument,
  block: ElementNode,
  start: number,
  end: number,
  data?: string
) {
  if (!data) return { offset: start }

  if (start !== end) {
    block.pieceTable.rangeDelete(start, end)
    end = start
  }

  block.pieceTable.caretInsert(start, data)
  return { offset: start + data.length }
}
