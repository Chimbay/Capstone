import { PieceTable } from '@editor/piece_table'
import type { BlockRule } from '@editor/types'

export const listRule: BlockRule = {
  name: 'list',
  match: line => line.startsWith('- '),
  parse: line => ({
    uuid: crypto.randomUUID(),
    tag: 'li',
    pieceTable: new PieceTable(line.slice(2))
  })
}
