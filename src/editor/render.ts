import { createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { DocumentBuffer } from './buffer'
import { handler } from './handler/handler'
import { parseBlock } from './parser/parse'
import { PieceTable } from './piece_table'
import { CursorTarget, ElementNode, ParsedBlock, SelectionState } from './types'

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
    this._selectionState = { collapsed: true, start: 0, end: 0, node: null }

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

  public setSelectionState(
    collapsed: boolean,
    block: ElementNode,
    start: number,
    end: number
  ): void {
    this._selectionState = { collapsed, node: block, start, end }
    this._notifySelection(v => v + 1)
  }

  // --- Input dispatch ---

  // Looks up the handler for the input type, runs it, and returns where the
  // cursor should land. Returns null if the input type has no registered handler.
  public handleInput(input: InputEvent): CursorTarget | null {
    const { node, start, end } = this._selectionState
    if (!node) return null

    const handle = handler[input.inputType]
    if (!handle) return null

    const cursor = handle(this, node, start, end, input.data ?? undefined)

    // Handlers that stay within the same block omit blockId — fill it in here
    return { blockId: cursor.blockId ?? node.uuid, offset: cursor.offset }
  }
}
