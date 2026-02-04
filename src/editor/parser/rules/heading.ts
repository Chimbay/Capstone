import { PieceTable } from '@editor/piece_table'
import type { BlockRule } from '@editor/types'

export const headingRule: BlockRule = {
  name: 'heading',
  match: line => /^#{1,6}\s+/.test(line),
  parse: line => {
    const [, syntax, rest] = line.match(/^(#{1,6})\s+(.+)$/)!
    return {
      uuid: crypto.randomUUID(),
      tag: `h${syntax.length}`,
      pieceTable: new PieceTable(rest)
    }
  }
}
