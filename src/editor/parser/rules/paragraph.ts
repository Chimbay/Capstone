import { PieceTable } from '@editor/piece_table'
import type { BlockRule } from '@editor/types'

export const paragraphRule: BlockRule = {
  name: 'paragraph',
  match: () => true,
  parse: line => ({
    uuid: crypto.randomUUID(),
    tag: 'p',
    pieceTable: new PieceTable(line)
  })
}
