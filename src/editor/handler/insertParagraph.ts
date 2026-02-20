import { PieceTable } from '@editor/piece_table'
import { RenderDocument } from '@editor/render'
import { ElementNode } from '@editor/types'


export function insertParagraph(
  editor: RenderDocument,
  block: ElementNode,
  start: number,
  end: number
) {
  if (start !== end) block.pieceTable.rangeDelete(start, end)
  const { left, right } = block.pieceTable.splitAt(start)
  
  // Make an add piece table and override
  const pt = new PieceTable('')
  pt.add = right
  pt.pieces = [{buffer: "Add", start: 0, len: right.length}]
  
  const newBlock: ElementNode = {
    uuid: crypto.randomUUID(),
    tag: 'p',
    pieceTable: pt
  }
  editor.blockMap.set(newBlock.uuid, newBlock)

  const idx = editor.documentBlocks.findIndex(b => b.uuid === block.uuid)
  editor.setDocumentBlocks(blocks => {
    blocks[idx].pieceTable = new PieceTable(left)
    blocks.splice(idx + 1, 0, newBlock)
  })

  return { blockid: newBlock.uuid, offset: 0 }
}
