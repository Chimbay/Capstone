import { createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { DocumentBuffer } from './buffer'
import { handler } from './handler/handler'
import { parseBlock } from './parser/parse'
import { PieceTable } from './piece_table'
import { Snapshot } from './snapshot'
import {
  CursorTarget,
  ElementNode,
  SelectionNode,
  SelectionState,
  StackVersion
} from './types'

// Top-level document model — owns the buffer, block list, and input dispatch.
export class RenderDocument {
  editHistory: Snapshot
  buffer: DocumentBuffer
  // uuid → block, for fast lookup by DOM id
  blockMap: Map<string, ElementNode>
  // reactive array driving the <For> in Editor
  documentBlocks: ElementNode[]
  setDocumentBlocks: (fn: (blocks: ElementNode[]) => void) => void

  private _selectionState: SelectionState
  private _trackSelection: () => number
  private _notifySelection: (fn: (v: number) => number) => void

  constructor(document: string) {
    this.buffer = new DocumentBuffer(document)
    this.blockMap = new Map()
    this.editHistory = new Snapshot()

    // Selection signal — independent from piece table reactivity
    const [track, notify] = createSignal(0)
    this._trackSelection = track
    this._notifySelection = notify

    // Parse each line into a block; pieces point into buffer.original (no copy)
    let lineStart = 0
    const initialBlocks = document.split('\n').map(line => {
      const { tag, text } = parseBlock(line)

      // prefixLen skips stripped markdown syntax (e.g. "## ")
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
  // Inserts a block into the document after the given index.
  public addBlock(block: ElementNode, afterIdx: number): void {
    this.blockMap.set(block.uuid, block)
    this.setDocumentBlocks(blocks => blocks.splice(afterIdx + 1, 0, block))
  }
  // Removes blocks between start and end (exclusive).
  public removeBlocks(start: number, end: number): void {
    for (let i = start + 1; i < end; i++) {
      this.blockMap.delete(this.documentBlocks[i].uuid)
    }
    this.setDocumentBlocks(blocks => blocks.splice(start + 1, end - start - 1))
  }
  public replaceBlock(from: ElementNode, into: ElementNode): void {
    const idx = this.documentBlocks.findIndex(b => b.uuid === into.uuid)
    if (idx === -1) return
    this.blockMap.delete(into.uuid)
    this.blockMap.set(from.uuid, from)
    this.setDocumentBlocks(blocks => blocks.splice(idx, 1, from))
  }
  // Merges `from` into `into`, removes `from`, returns cursor at join point.
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

  // --- History ---

  // Captures full document state: all blocks + their order.
  public captureFullDoc(): StackVersion {
    const anchor = this._selectionState.anchor
    return {
      blocks: this.documentBlocks.map(b => ({
        uuid: b.uuid,
        tag: b.tag,
        pieces: b.pieceTable.pieces.map(p => ({ ...p }))
      })),
      blockOrder: this.documentBlocks.map(b => b.uuid),
      cursor: { uuid: anchor.block.uuid, offset: anchor.offset }
    }
  }

  // Restores document to a previously captured StackVersion.
  public restoreSnapshot(v: StackVersion): void {
    for (const snap of v.blocks) {
      if (this.blockMap.has(snap.uuid)) {
        this.blockMap.get(snap.uuid).pieceTable.setPieceTable(snap.pieces)
      } else {
        const block: ElementNode = {
          uuid: snap.uuid,
          tag: snap.tag,
          pieceTable: new PieceTable(
            this.buffer,
            snap.pieces.map(p => ({ ...p }))
          )
        }
        this.blockMap.set(snap.uuid, block)
      }
    }
    const orderSet = new Set(v.blockOrder)
    for (const block of this.documentBlocks) {
      if (!orderSet.has(block.uuid)) this.blockMap.delete(block.uuid)
    }
    this.setDocumentBlocks(blocks => {
      const restored = v.blockOrder.map(uuid => this.blockMap.get(uuid))
      blocks.splice(0, blocks.length, ...restored)
    })
  }

  // --- Accessors ---
  public getSelectionState(): SelectionState {
    this._trackSelection()
    return this._selectionState
  }
  public getDocumentBlocks(): ElementNode[] {
    return this.documentBlocks
  }
  public getDocumentBlock(uuid: string): ElementNode | undefined {
    return this.blockMap.get(uuid)
  }
  // --- Setters ---
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
  public handleInput(inputType: string, data?: string): CursorTarget | undefined {
    const { anchor } = this._selectionState

    const handle = handler[inputType]
    if (!handle) return undefined

    const cursor = handle(this, this._selectionState, data)

    // Fill in block from anchor if handler omitted it.
    if (!cursor) return undefined
    return { block: cursor.block ?? anchor.block, offset: cursor.offset }
  }
}
