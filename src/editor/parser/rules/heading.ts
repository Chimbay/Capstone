import type { BlockRule } from '@editor/types'

export const headingRule: BlockRule = {
  name: 'heading',
  // Requires text after the marker so parse's capture always matches ("# " used to crash the load)
  match: line => /^#{1,6}\s+\S/.test(line),
  parse: line => {
    // [^] not '.': '.' skips CR, so a CRLF line passed match but failed here and crashed the load
    const [, syntax, rest] = /^(#{1,6})\s+([^]+)$/.exec(line)
    return { tag: `h${syntax.length}`, text: rest }
  }
}
