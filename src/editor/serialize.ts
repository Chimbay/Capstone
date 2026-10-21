import { ElementNode } from './types'

export function serialize(blocks: ElementNode[], eol = '\n'): string {
  return blocks.map(serializeBlock).join(eol)
}

// Must mirror every tag parser/rules/* can produce, or that markup is lost on save.
function serializeBlock(block: ElementNode): string {
  const text = block.pieceTable.formatText()
  const heading = /^h([1-6])$/.exec(block.tag)
  if (heading) return `${'#'.repeat(Number(heading[1]))} ${text}`
  if (block.tag === 'li') return `- ${text}`
  return text
}
