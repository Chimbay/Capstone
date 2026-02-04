import { PieceTable } from '@editor/piece_table'
import type { BlockRule } from '@editor/types'

export const breakRule: BlockRule = {
  name: 'break',
  match: line => line.length === 0,
  parse: () => ({
    uuid: crypto.randomUUID(),
    tag: 'br',
    pieceTable: new PieceTable('')
  })
}
