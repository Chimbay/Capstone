import { ElementNode } from './types'

export function serialize(blocks: ElementNode[]): string {
  return blocks.map(serializeBlock).join('\n')
}

function serializeBlock(block: ElementNode): string {
  const text = block.pieceTable.formatText()
  switch (block.tag) {
    case 'h1':
      return `# ${text}`
    case 'h2':
      return `## ${text}`
    case 'h3':
      return `### ${text}`
    case 'li':
      return `- ${text}`
    default:
      return text
  }
}
