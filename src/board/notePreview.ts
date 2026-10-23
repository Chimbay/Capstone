import { splitNote } from '@editor/note_file'
import { parseBlock } from '@editor/parser/parse'
import type { ParsedBlock } from '@editor/types'

// The first blocks of a note's body, parsed by the note editor's own rules so a card shows
// headings and lists the same way the editor does. Blank lines are dropped: a card has no room.
export function previewBlocks(markdown: string, max = 8): ParsedBlock[] {
  return splitNote(markdown)
    .body.split(/\r?\n/)
    .map(parseBlock)
    .filter(block => block.text.trim() !== '')
    .slice(0, max)
}
