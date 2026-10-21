// Optional BOM, then a front-matter block only if it opens the file AND has a closing `---` line
// (trailing spaces allowed, like the Rust scan's trim_end).
const HEAD = /^\uFEFF?(?:---[ \t]*\r?\n(?:[^]*?\r?\n)?---[ \t]*(?:\r?\n|$))?/

// Splits a note into its header (BOM + front matter, re-attached byte-for-byte on save),
// the editable body, and the line ending to write the body back with.
export function splitNote(text: string): { head: string; body: string; eol: string } {
  const head = HEAD.exec(text)[0]
  return {
    head,
    body: text.slice(head.length),
    eol: text.includes('\r\n') ? '\r\n' : '\n'
  }
}
