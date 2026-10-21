import { expect, test } from 'bun:test'
import { createRoot } from 'solid-js'
import { splitNote } from './note_file'
import { parseBlock } from './parser/parse'
import { RenderDocument } from './render'
import { serialize } from './serialize'

// Load → editor → save, the way View.tsx does it.
function roundTrip(text: string): string {
  return createRoot(dispose => {
    const { head, body, eol } = splitNote(text)
    const doc = new RenderDocument(body)
    dispose()
    return head + serialize(doc.getDocumentBlocks(), eol)
  })
}

test('heading with a trailing CR parses instead of throwing', () => {
  expect(parseBlock('# a\r').tag).toBe('h1')
})

test('CRLF note with a heading loads with correct text', () => {
  createRoot(dispose => {
    const doc = new RenderDocument('# Title\r\n- item\r\npara')
    const blocks = doc.getDocumentBlocks()
    expect(blocks.map(b => [b.tag, b.pieceTable.formatText()])).toEqual([
      ['h1', 'Title'],
      ['li', 'item'],
      ['p', 'para']
    ])
    dispose()
  })
})

test('every block type round-trips, including h4–h6', () => {
  const text = '# 1\n## 2\n### 3\n#### 4\n##### 5\n###### 6\n- item\n- \npara\n\nend'
  expect(roundTrip(text)).toBe(text)
})

test('CRLF line endings are preserved on save', () => {
  const text = '---\r\nuuid: abc\r\n---\r\n# Title\r\n\r\n#### Sub\r\nbody\r\n'
  expect(roundTrip(text)).toBe(text)
})

test('front matter is stripped from the body and re-attached byte-for-byte', () => {
  const head = '---\nuuid: 1234\ntitle: x\n---  \n'
  expect(splitNote(head + '# Hi\nbody')).toEqual({ head, body: '# Hi\nbody', eol: '\n' })
  expect(roundTrip(head + '# Hi\nbody')).toBe(head + '# Hi\nbody')
  // Header with nothing after it
  expect(splitNote('---\nuuid: 1\n---').body).toBe('')
  expect(splitNote('---\n---\nx').head).toBe('---\n---\n')
})

test('a leading --- without a closing line is not front matter', () => {
  const text = '---\nuuid: 1234\nbody'
  expect(splitNote(text)).toEqual({ head: '', body: text, eol: '\n' })
  // '----' is not a closing line
  expect(splitNote('---\na\n----\n').head).toBe('')
  // Front matter must start the file
  expect(splitNote('x\n---\na\n---\n').head).toBe('')
})

test('a UTF-8 BOM stays in the header, with or without front matter', () => {
  const fm = '\uFEFF---\r\nuuid: 1\r\n---\r\n'
  expect(splitNote(fm + 'body')).toEqual({ head: fm, body: 'body', eol: '\r\n' })
  expect(roundTrip(fm + 'body')).toBe(fm + 'body')
  expect(splitNote('\uFEFF# Hi')).toEqual({ head: '\uFEFF', body: '# Hi', eol: '\n' })
  expect(roundTrip('\uFEFF# Hi')).toBe('\uFEFF# Hi')
})
