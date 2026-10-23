import { expect, test } from 'bun:test'
import { previewBlocks } from './notePreview'

test('parses headings and lists like the editor, without the id header', () => {
  const note =
    '---\r\nuuid: n-1\r\n---\r\n# Kickoff\r\n\r\n- goals\r\n- owners\r\n#### Detail\r\nplain'
  expect(previewBlocks(note)).toEqual([
    { tag: 'h1', text: 'Kickoff' },
    { tag: 'li', text: 'goals' },
    { tag: 'li', text: 'owners' },
    { tag: 'h4', text: 'Detail' },
    { tag: 'p', text: 'plain' }
  ])
})

test('stops after max blocks and handles an empty note', () => {
  expect(previewBlocks('a\nb\nc\nd', 2)).toEqual([
    { tag: 'p', text: 'a' },
    { tag: 'p', text: 'b' }
  ])
  expect(previewBlocks('---\nuuid: x\n---\n')).toEqual([])
})
