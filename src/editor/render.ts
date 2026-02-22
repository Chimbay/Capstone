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

    const selection: SelectionNode = { node: blocks[0], offset: 0 }
    this._selectionState = { anchorNode: selection }
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

  public setSelectionState(anchor: SelectionNode, focus?: SelectionNode): void {
    if (!focus) {
      this._selectionState = { anchorNode: anchor }
      this._notifySelection(v => v + 1)
      return
    }

    if (!anchor.node || !focus.node) return

    const anchorIdx = this.documentBlocks.findIndex(b => b.uuid === anchor.node.uuid)
    const focusIdx = this.documentBlocks.findIndex(b => b.uuid === focus.node.uuid)
    if (anchorIdx === -1 || focusIdx === -1) return

    const range: [number, number] =
      anchorIdx <= focusIdx ? [anchorIdx, focusIdx] : [focusIdx, anchorIdx]

    this._selectionState = { anchorNode: anchor, focusNode: focus, selected: range }

    this._notifySelection(v => v + 1)
  }

  // --- Input dispatch ---

  // Looks up the handler for the input type, runs it, and returns where the
  // cursor should land. Returns null if the input type has no registered handler.
  public handleInput(input: InputEvent): CursorTarget | null {
    const { anchorNode, focusNode } = this._selectionState
    
    const node = anchorNode.node
    if (!node) return null

    const handle = handler[input.inputType]
    if (!handle) return null

    const rawEnd = focusNode?.offset ?? anchorNode.offset
    const start = Math.min(anchorNode.offset, rawEnd)
    const end = Math.max(anchorNode.offset, rawEnd)

    const cursor = handle(this, node, start, end, input.data ?? undefined)

    // Handlers that stay within the same block omit blockId + returns cursor position.
    return { blockId: cursor.blockId ?? node.uuid, offset: cursor.offset }
  }
}
