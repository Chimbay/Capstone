import type { BlockRule } from '@editor/types'

export const breakRule: BlockRule = {
  name: 'break',
  match: line => line.trim().length === 0,
  parse: () => ({ tag: 'p', text: '' })
}
