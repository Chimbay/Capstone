import { parseBlock } from '@editor/parser/parse'
import type { ParsedBlock } from '@editor/types'

// A card's text as blocks, by the note editor's own rules. Two card-only additions: `* ` is a
// bullet like `- `, and a `> ` line right under a `#` heading is that heading's subtitle ('sub').
export function cardBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  if (!text) return blocks
  for (const line of text.split(/\r?\n/)) {
    if (blocks.at(-1)?.tag === 'h1' && line.startsWith('> '))
      blocks.push({ tag: 'sub', text: line.slice(2) })
    else blocks.push(parseBlock(line.replace(/^\* /, '- ')))
  }
  return blocks
}

export type Inline = { text: string; bold: boolean; italic: boolean; underline: boolean }
type Style = Omit<Inline, 'text'>
type Run = Style & { at: number; end: number }

// Marker runs that toggle a style: `*` italic, `**` bold, `***` both, `__` underline. A run with
// spaces on both sides (2 * 3), a lone `_` (snake_case) or an unpaired last marker stays literal.
// `cut` splits a run in two, so a caret inside a fresh `****` sits between an opener and a closer.
function markerRuns(text: string, cut = -1): Run[] {
  const runs: Run[] = []
  for (const m of text.matchAll(/\*+|_+/g)) {
    const end = m.index + m[0].length
    const parts = cut > m.index && cut < end ? [m.index, cut, end] : [m.index, end]
    for (let i = 1; i < parts.length; i++) {
      const [at, to] = [parts[i - 1], parts[i]]
      const n = to - at
      const spaced = /\s/.test(text[at - 1] ?? ' ') && /\s/.test(text[to] ?? ' ')
      if (spaced) continue
      if (m[0][0] === '_') {
        if (n === 2)
          runs.push({ at, end: to, bold: false, italic: false, underline: true })
      } else if (n <= 3)
        runs.push({ at, end: to, bold: n >= 2, italic: n !== 2, underline: false })
    }
  }
  for (const k of ['bold', 'italic', 'underline'] as const) {
    const toggles = runs.filter(r => r[k])
    if (toggles.length % 2) toggles[toggles.length - 1][k] = false
  }
  return runs
}

// Inline text as styled parts. Markers that pair up are dropped; the rest stays literal text.
export function splitInline(text: string): Inline[] {
  const parts: Inline[] = []
  const style: Style = { bold: false, italic: false, underline: false }
  let from = 0
  const push = (to: number) => {
    const last = parts.at(-1)
    const chunk = text.slice(from, to)
    if (!chunk) return
    if (
      last &&
      last.bold === style.bold &&
      last.italic === style.italic &&
      last.underline === style.underline
    )
      last.text += chunk
    else parts.push({ text: chunk, ...style })
  }
  for (const r of markerRuns(text)) {
    // The run's unpaired leftover (e.g. one `*` of an unmatched `***`) stays as literal text
    push(r.end - (r.bold ? 2 : 0) - (r.italic ? 1 : 0) - (r.underline ? 2 : 0))
    from = r.end
    style.bold = style.bold !== r.bold
    style.italic = style.italic !== r.italic
    style.underline = style.underline !== r.underline
  }
  push(text.length)
  return parts
}

// A text edit's result: the new text and where the selection goes.
export type Edit = { text: string; start: number; end: number }

const PREFIX = /^(#{1,6} |[-*] )/
const lineAt = (text: string, pos: number) => {
  const start = text.slice(0, pos).lastIndexOf('\n') + 1
  const end = text.indexOf('\n', pos)
  return { start, line: text.slice(start, end < 0 ? text.length : end) }
}

// Toggles `mark` (`**`, `*` or `__`) around the selection, or around the caret when nothing is
// selected. Markers just outside or just inside the selection are removed; otherwise it's wrapped.
export function toggleWrap(text: string, start: number, end: number, mark: string): Edit {
  const c = mark[0]
  const len = mark.length
  // `*` counts only on an odd run, so italic doesn't eat one star of a surrounding `**`
  const has = (run: number) => (mark === '*' ? run % 2 === 1 : run >= len)
  const runOf = (s: string) => {
    let n = 0
    while (s[n] === c) n++
    return n
  }
  const before = runOf([...text.slice(0, start)].reverse().join(''))
  const after = runOf(text.slice(end))
  if (has(Math.min(before, after)))
    return {
      text: text.slice(0, start - len) + text.slice(start, end) + text.slice(end + len),
      start: start - len,
      end: end - len
    }
  const sel = text.slice(start, end)
  const inner = Math.min(runOf(sel), runOf([...sel].reverse().join('')))
  if (sel.length > 2 * len && inner < sel.length && has(inner))
    return {
      text: text.slice(0, start) + sel.slice(len, -len) + text.slice(end),
      start,
      end: end - 2 * len
    }
  return {
    text: text.slice(0, start) + mark + sel + mark + text.slice(end),
    start: start + len,
    end: end + len
  }
}

// Swaps the start line's `old`-character prefix for `prefix`, keeping the selection on the same text.
function replacePrefix(
  text: string,
  start: number,
  end: number,
  old: number,
  prefix: string
): Edit {
  const at = lineAt(text, start).start
  const shift = (pos: number) =>
    pos < at ? pos : Math.max(at + prefix.length, pos + prefix.length - old)
  return {
    text: text.slice(0, at) + prefix + text.slice(at + old),
    start: shift(start),
    end: shift(end)
  }
}

// Toggles a line prefix (`# `, `## ` or `- `) on the selection's first line, replacing any other
// heading or bullet prefix.
export function toggleLine(
  text: string,
  start: number,
  end: number,
  prefix: string
): Edit {
  const old = PREFIX.exec(lineAt(text, start).line)?.[0] ?? ''
  const same = old.replace('* ', '- ') === prefix
  return replacePrefix(text, start, end, old.length, same ? '' : prefix)
}

// Puts `:name: ` after the heading's #s (replacing an icon already there), or makes the line a
// `# ` title starting with the icon. `bare` text is a heading card's, edited without its #s.
export function insertIcon(
  text: string,
  start: number,
  end: number,
  name: string,
  bare = false
): Edit {
  const line = lineAt(text, start).line
  const m = /^(#{1,6} )(:[a-z]+:(?: |$))?|^([-*] )?/.exec(bare ? `# ${line}` : line)
  return bare
    ? replacePrefix(text, start, end, m[0].length - 2, `:${name}: `)
    : replacePrefix(text, start, end, m[0].length, `${m[1] ?? '# '}:${name}: `)
}

// Toolbar ids for the formats in effect at `caret`: the line's prefix, then the inline styles.
export function activeFormats(text: string, caret: number): string[] {
  const { start, line } = lineAt(text, caret)
  const prefix = PREFIX.exec(line)?.[0] ?? ''
  const on = prefix.startsWith('##')
    ? ['h2']
    : prefix === '# '
      ? ['h1']
      : prefix
        ? ['li']
        : []
  const pos = caret - start - prefix.length
  const style: Style = { bold: false, italic: false, underline: false }
  for (const r of markerRuns(line.slice(prefix.length), pos))
    if (r.end <= pos) {
      style.bold = style.bold !== r.bold
      style.italic = style.italic !== r.italic
      style.underline = style.underline !== r.underline
    }
  return [...on, ...(['bold', 'italic', 'underline'] as const).filter(k => style[k])]
}

// A heading's leading `:name:` token, when `name` is a known icon. Anything else stays text.
export function splitIcon(
  text: string,
  names: readonly string[]
): { icon?: string; text: string } {
  const m = /^:([a-z]+):(?: |$)/.exec(text)
  return m && names.includes(m[1])
    ? { icon: m[1], text: text.slice(m[0].length) }
    : { text }
}

// A heading card's level as its `# `..`###### ` prefix, or '' when the text isn't a heading
export const headingPrefix = (text: string) => /^#{1,6} /.exec(text)?.[0] ?? ''

// The text with `prefix` dropped from each line that has it, so a heading card edits bare
export const stripHeading = (text: string, prefix: string) =>
  text
    .split('\n')
    .map(line => (line.startsWith(prefix) ? line.slice(prefix.length) : line))
    .join('\n')

// Every non-empty line becomes a heading of the card's level, so its lines all look alike
export const applyHeading = (text: string, prefix: string) =>
  text
    .split('\n')
    .map(line => (line ? prefix + line : line))
    .join('\n')
