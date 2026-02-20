import type { BlockRule } from '@editor/types'

export const headingRule: BlockRule = {
  name: 'heading',
  match: line => /^#{1,6}\s+/.test(line),
  parse: line => {
    const [, syntax, rest] = line.match(/^(#{1,6})\s+(.+)$/)!
    return { tag: `h${syntax.length}`, text: rest }
  }
}
