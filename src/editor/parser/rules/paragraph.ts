import { PieceTable } from '@editor/piece_table'
import type { BlockRule } from '@editor/types'

export const paragraphRule: BlockRule = {
  name: 'paragraph',
  match: line => line.trim().length > 0,
  parse: line => ({
    uuid: crypto.randomUUID(),
    tag: 'p',
    pieceTable: new PieceTable(line)
  })
}
