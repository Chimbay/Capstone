import { expect, test } from 'bun:test'
import {
  activeFormats,
  applyHeading,
  cardBlocks,
  headingPrefix,
  insertIcon,
  splitIcon,
  splitInline,
  stripHeading,
  toggleLine,
  toggleWrap
} from './markdown'

test('parses headings, a subtitle under #, bullets, blanks and paragraphs', () => {
  const text =
    '# Tools\r\n> Apps used here\r\n\r\n## LinkedIn:\n- one\n* two\n> not a subtitle\nplain'
  expect(cardBlocks(text)).toEqual([
    { tag: 'h1', text: 'Tools' },
    { tag: 'sub', text: 'Apps used here' },
    { tag: 'p', text: '' },
    { tag: 'h2', text: 'LinkedIn:' },
    { tag: 'li', text: 'one' },
    { tag: 'li', text: 'two' },
    { tag: 'p', text: '> not a subtitle' },
    { tag: 'p', text: 'plain' }
  ])
  expect(cardBlocks('')).toEqual([])
})

test('parses every heading level the text wheel makes', () => {
  expect(cardBlocks('# a\n## b\n### c\n#### d')).toEqual([
    { tag: 'h1', text: 'a' },
    { tag: 'h2', text: 'b' },
    { tag: 'h3', text: 'c' },
    { tag: 'h4', text: 'd' }
  ])
})

const plain = { bold: false, italic: false, underline: false }

test('splits bold markers and leaves an unpaired one literal', () => {
  expect(splitInline('a **b** c')).toEqual([
    { ...plain, text: 'a ' },
    { ...plain, text: 'b', bold: true },
    { ...plain, text: ' c' }
  ])
  expect(splitInline('x**y**z**w')).toEqual([
    { ...plain, text: 'x' },
    { ...plain, text: 'y', bold: true },
    { ...plain, text: 'z**w' }
  ])
  expect(splitInline('**a')).toEqual([{ ...plain, text: '**a' }])
  expect(splitInline('<b>hi</b>')).toEqual([{ ...plain, text: '<b>hi</b>' }])
})

test('splits italic, underline and nested styles', () => {
  expect(splitInline('a *b* c')).toEqual([
    { ...plain, text: 'a ' },
    { ...plain, text: 'b', italic: true },
    { ...plain, text: ' c' }
  ])
  expect(splitInline('***both***')).toEqual([
    { ...plain, text: 'both', bold: true, italic: true }
  ])
  expect(splitInline('**a *b* c**')).toEqual([
    { ...plain, text: 'a ', bold: true },
    { ...plain, text: 'b', bold: true, italic: true },
    { ...plain, text: ' c', bold: true }
  ])
  expect(splitInline('__x__ y')).toEqual([
    { ...plain, text: 'x', underline: true },
    { ...plain, text: ' y' }
  ])
  expect(splitInline('__**x**__')).toEqual([
    { ...plain, text: 'x', bold: true, underline: true }
  ])
  expect(splitInline('snake_case and _ alone')).toEqual([
    { ...plain, text: 'snake_case and _ alone' }
  ])
  expect(splitInline('2 * 3 * 4')).toEqual([{ ...plain, text: '2 * 3 * 4' }])
  expect(splitInline('*a')).toEqual([{ ...plain, text: '*a' }])
  // A `* ` bullet's marker is stripped by cardBlocks, so it never reaches the inline parser
  expect(cardBlocks('* *x*')).toEqual([{ tag: 'li', text: '*x*' }])
})

test('toggles a wrap around the selection or caret', () => {
  expect(toggleWrap('a b c', 2, 3, '**')).toEqual({ text: 'a **b** c', start: 4, end: 5 })
  expect(toggleWrap('a **b** c', 4, 5, '**')).toEqual({ text: 'a b c', start: 2, end: 3 })
  expect(toggleWrap('a **b** c', 2, 7, '**')).toEqual({ text: 'a b c', start: 2, end: 3 })
  expect(toggleWrap('ab', 1, 1, '**')).toEqual({ text: 'a****b', start: 3, end: 3 })
  expect(toggleWrap('a****b', 3, 3, '**')).toEqual({ text: 'ab', start: 1, end: 1 })
  expect(toggleWrap('ab', 1, 1, '*')).toEqual({ text: 'a**b', start: 2, end: 2 })
  expect(toggleWrap('a *b* c', 3, 4, '*')).toEqual({ text: 'a b c', start: 2, end: 3 })
  // Italic inside bold adds its own stars rather than taking one of bold's
  expect(toggleWrap('**b**', 2, 3, '*')).toEqual({ text: '***b***', start: 3, end: 4 })
  expect(toggleWrap('***b***', 3, 4, '*')).toEqual({ text: '**b**', start: 2, end: 3 })
  expect(toggleWrap('***b***', 3, 4, '**')).toEqual({ text: '*b*', start: 1, end: 2 })
  expect(toggleWrap('a b', 2, 3, '__')).toEqual({ text: 'a __b__', start: 4, end: 5 })
  expect(toggleWrap('a __b__', 4, 5, '__')).toEqual({ text: 'a b', start: 2, end: 3 })
})

test('toggles a line prefix, replacing another heading or bullet', () => {
  expect(toggleLine('one\ntwo', 5, 5, '# ')).toEqual({
    text: 'one\n# two',
    start: 7,
    end: 7
  })
  expect(toggleLine('one\n# two', 7, 7, '# ')).toEqual({
    text: 'one\ntwo',
    start: 5,
    end: 5
  })
  expect(toggleLine('# two', 0, 0, '# ')).toEqual({ text: 'two', start: 0, end: 0 })
  expect(toggleLine('## two', 4, 4, '# ')).toEqual({ text: '# two', start: 3, end: 3 })
  expect(toggleLine('* two', 3, 3, '- ')).toEqual({ text: 'two', start: 1, end: 1 })
  expect(toggleLine('- two', 3, 3, '## ')).toEqual({ text: '## two', start: 4, end: 4 })
  expect(toggleLine('\ntwo', 0, 0, '- ')).toEqual({ text: '- \ntwo', start: 2, end: 2 })
})

test('inserts an icon token after the heading marker', () => {
  expect(insertIcon('## Goal', 4, 4, 'target')).toEqual({
    text: '## :target: Goal',
    start: 13,
    end: 13
  })
  expect(insertIcon('# :star: Goal', 10, 10, 'flag')).toEqual({
    text: '# :flag: Goal',
    start: 10,
    end: 10
  })
  expect(insertIcon('a\n- Goal', 3, 3, 'flag')).toEqual({
    text: 'a\n# :flag: Goal',
    start: 11,
    end: 11
  })
})

test('reports the formats in effect at the caret', () => {
  expect(activeFormats('# a **b** c', 6)).toEqual(['h1', 'bold'])
  expect(activeFormats('# a **b** c', 9)).toEqual(['h1'])
  expect(activeFormats('### x', 5)).toEqual(['h2'])
  expect(activeFormats('x\n* a *b*', 8)).toEqual(['li', 'italic'])
  expect(activeFormats('***b***', 4)).toEqual(['bold', 'italic'])
  expect(activeFormats('a****b', 3)).toEqual(['bold'])
  expect(activeFormats('a __u__', 5)).toEqual(['underline'])
  expect(activeFormats('snake_case', 7)).toEqual([])
})

test('splits a known icon token off the start of a heading only', () => {
  const names = ['layers', 'target']
  expect(splitIcon(':layers: Tools', names)).toEqual({ icon: 'layers', text: 'Tools' })
  expect(splitIcon(':nope: Tools', names)).toEqual({ text: ':nope: Tools' })
  expect(splitIcon('Tools :target:', names)).toEqual({ text: 'Tools :target:' })
  expect(splitIcon('Tools', names)).toEqual({ text: 'Tools' })
})

test('edits a heading card without its #s and puts them back on save', () => {
  expect(headingPrefix('## :layers: Tools')).toBe('## ')
  expect(headingPrefix('#Tools')).toBe('')
  expect(headingPrefix('- a')).toBe('')
  expect(stripHeading('## :layers: Tools\n## More', '## ')).toBe(':layers: Tools\nMore')
  expect(applyHeading(':layers: Tools\n\nMore', '## ')).toBe(
    '## :layers: Tools\n\n## More'
  )
  expect(applyHeading('', '# ')).toBe('')
  expect(stripHeading('plain', '')).toBe('plain')
  expect(applyHeading('plain', '')).toBe('plain')
})
