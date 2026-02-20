import type { BlockRule } from '@editor/types'

export const paragraphRule: BlockRule = {
  name: 'paragraph',
  match: () => true,
  parse: line => ({ tag: 'p', text: line })
}
