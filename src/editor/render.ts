import { createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { handler } from './handler/handler'
import { parseBlock } from './parser/parse'
import { CursorTarget, ElementNode, SelectionState } from './types'

// Document
export class RenderDocument {
  blockMap: Map<string, ElementNode>
  documentBlocks: ElementNode[]
  setDocumentBlocks: (fn: (blocks: ElementNode[]) => void) => void

  private _selectionState: SelectionState
  private _trackSelection: () => number
  private _notifySelection: (fn: (v: number) => number) => void

  public constructor(document: string) {
    const splits = document.split('\n')

    this.blockMap = new Map()
    this._selectionState = { collapsed: true, start: 0, end: 0, node: null }

    const [track, notify] = createSignal(0)
    this._trackSelection = track
    this._notifySelection = notify

    const initialBlocks = splits.map(s => {
      const block: ElementNode = parseBlock(s)
      this.blockMap.set(block.uuid, block)
      return block
    })

    const [blocks, setBlocks] = createStore(initialBlocks)
    this.documentBlocks = blocks
    this.setDocumentBlocks = fn => setBlocks(produce(fn))
  }

  // Accessors
  public getDocumentBlocks(): ElementNode[] {
    return this.documentBlocks
  }

  // Reactive read — registers a tracking dependency in Solid components
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

  // Input dispatch
  // Mutates the document and returns where the cursor should land
  public handleInput(input: InputEvent): CursorTarget | null {
    const { node, start, end } = this._selectionState
    if (!node) return null

    const content = input.data ?? undefined

    const handle = handler[input.inputType]
    if (!handle) return null

    const cursor = handle(this, node, start, end, content)
    return { blockId: cursor.blockId ?? node.uuid, offset: cursor.offset }
  }
}
