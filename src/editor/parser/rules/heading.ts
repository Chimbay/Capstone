import type { BlockRule } from '@editor/types'

export const headingRule: BlockRule = {
  name: 'heading',
  // Requires text after the marker so parse's (.+) always matches ("# " used to crash the load)
  match: line => /^#{1,6}\s+\S/.test(line),
  parse: line => {
    const [, syntax, rest] = line.match(/^(#{1,6})\s+(.+)$/)
    return { tag: `h${syntax.length}`, text: rest }
  }
}
