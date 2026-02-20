// DocumentBuffer holds the two append-only string buffers shared across all
// blocks in a document. Every Piece in every PieceTable references a character
// range inside these two strings by index, which means pieces can be moved
// between blocks (on split or merge) without copying or serialising text.
//
//   original — the full document text as it was loaded from disk, never mutated
//   add      — all text inserted during the current session, only ever appended to
export class DocumentBuffer {
  original: string
  add: string

  constructor(original: string) {
    this.original = original
    this.add = ''
  }
}
