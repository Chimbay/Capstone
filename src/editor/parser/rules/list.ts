import type { BlockRule } from '@editor/types'

export const listRule: BlockRule = {
  name: 'list',
  match: line => line.startsWith('- '),
  parse: line => ({ tag: 'li', text: line.slice(2) })
}
