import { createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { DocumentBuffer } from './buffer'
import { handler } from './handler/handler'
import { parseBlock } from './parser/parse'
import { PieceTable } from './piece_table'
import { CursorTarget, ElementNode, SelectionNode, SelectionState } from './types'

// RenderDocument is the top-level document model.
// It owns the shared DocumentBuffer and the reactive block list,
// and is the single entry point for all input dispatch.
export class RenderDocument {
  buffer: DocumentBuffer
  blockMap: Map<string, ElementNode> // uuid → block, for fast lookup by DOM id
  documentBlocks: ElementNode[] // reactive array driving the <For> in Editor
  setDocumentBlocks: (fn: (blocks: ElementNode[]) => void) => void

  private _selectionState: SelectionState
  private _trackSelection: () => number
  private _notifySelection: (fn: (v: number) => number) => void

  constructor(document: string) {
    this.buffer = new DocumentBuffer(document)
    this.blockMap = new Map()

    // Selection reactivity — separate from piece table signals so the debug
    // panel can subscribe to cursor changes independently
    const [track, notify] = createSignal(0)
    this._trackSelection = track
    this._notifySelection = notify

    // Parse each line and build a PieceTable whose pieces point directly into
    // buffer.original. No text is copied — each block just stores the offset
    // of its content within the original document string.
    let lineStart = 0
    const initialBlocks = document.split('\n').map(line => {
      const { tag, text } = parseBlock(line)

      // The parser may strip a markdown prefix (e.g. "## " for headings).
      // prefixLen tells us where within the line the visible text begins.
      const prefixLen = line.length - text.length
      const pieces =
        text.length > 0
          ? [
              {
                buffer: 'Original' as const,
                start: lineStart + prefixLen,
                len: text.length
              }
            ]
          : []

      const block: ElementNode = {
        uuid: crypto.randomUUID(),
        tag,
        pieceTable: new PieceTable(this.buffer, pieces)
      }

      this.blockMap.set(block.uuid, block)
      lineStart += line.length + 1 // +1 for the '\n' separator
      return block
    })

    const [blocks, setBlocks] = createStore(initialBlocks)
    this.documentBlocks = blocks
    this.setDocumentBlocks = fn => setBlocks(produce(fn))

    const selection: SelectionNode = { block: blocks[0], offset: 0 }
    this._selectionState = { anchor: selection, focus: selection }
  }
  // --- Manipulations ---
  // Removes all blocks strictly between start and end indices (exclusive of both endpoints).
  public removeBlocks(start: number, end: number): void {
    for (let i = start + 1; i < end; i++) {
      this.blockMap.delete(this.documentBlocks[i].uuid)
    }
    this.setDocumentBlocks(blocks => blocks.splice(start + 1, end - start - 1))
  }
  // Appends `from`'s pieces into `into`, removes `from` from the block list, and
  // returns a CursorTarget at the join point (start of the appended content).
  public mergeBlocks(
    into: ElementNode,
    from: ElementNode,
    fromIdx: number
  ): CursorTarget {
    const joinOffset = into.pieceTable.totalLength()
    into.pieceTable.append(from.pieceTable)
    this.blockMap.delete(from.uuid)
    this.setDocumentBlocks(blocks => blocks.splice(fromIdx, 1))
    return { block: into, offset: joinOffset }
  }

  // --- Accessors ---
  public getDocumentBlocks(): ElementNode[] {
    return this.documentBlocks
  }
  // Reactive read — registers a Solid tracking dependency so components
  // re-render whenever setSelectionState is called.
  public getSelectionState(): SelectionState {
    this._trackSelection()
    return this._selectionState
  }
  public setSelectionState(anchor: SelectionNode, focus: SelectionNode): void {
    this._selectionState = { anchor, focus }
    // Case: same block — no range needed
    if (anchor.block.uuid === focus.block.uuid) {
      this._notifySelection(v => v + 1)
      return
    }

    const anchorIdx = this.documentBlocks.findIndex(b => b.uuid === anchor.block.uuid)
    const focusIdx = this.documentBlocks.findIndex(b => b.uuid === focus.block.uuid)
    if (anchorIdx === -1 || focusIdx === -1) return

    const blockRange: [number, number] =
      anchorIdx <= focusIdx ? [anchorIdx, focusIdx] : [focusIdx, anchorIdx]

    this._selectionState = { anchor, focus, blockRange }

    this._notifySelection(v => v + 1)
  }

  // --- Input dispatch ---
  // Looks up the handler for the input type, runs it, and returns where the
  // cursor should land. Returns null if the input type has no registered handler.
  public handleInput(input: InputEvent): CursorTarget | null {
    const { anchor } = this._selectionState

    const handle = handler[input.inputType]
    if (!handle) return null

    const clipboard: string | undefined = input.dataTransfer?.getData('text/plain')

    const cursor = handle(
      this,
      this._selectionState,
      input.data ?? clipboard ?? undefined
    )

    // Handlers that stay within the same block omit block — fill it in from anchor.
    return { block: cursor.block ?? anchor.block, offset: cursor.offset }
  }
}
