import { For } from 'solid-js'
import BlockRenderer from './BlockRenderer'
import PieceTableDebug from './debug'
import { RenderDocument } from './render'
import { ElementNode, SelectionNode } from './types'

export default function Editor(props: { doc: RenderDocument }) {
  const blocks = props.doc.getDocumentBlocks()

  // Walk up the DOM from the current selection anchor to find the nearest
  // element with an id, then look it up in blockMap to get the ElementNode.
  function getBlockFromNode(node: Node): ElementNode | undefined {
    const el = (
      node.nodeType === Node.TEXT_NODE
        ? (node as Text).parentElement
        : (node as HTMLElement)
    )?.closest('[id]')
    return props.doc.blockMap.get(el?.id ?? '')
  }

  function resolveSelection(sel: Selection): void {
    // Normalise anchor/focus order so start <= end regardless of selection direction
    const anchor: SelectionNode = {
      node: getBlockFromNode(sel.anchorNode),
      offset: sel.anchorOffset
    }
    const focus: SelectionNode = {
      node: getBlockFromNode(sel.focusNode),
      offset: sel.focusOffset
    }
    props.doc.setSelectionState(anchor, focus)
  }

  function handleBeforeInput(input: InputEvent): void {
    input.preventDefault()

    const sel = document.getSelection()
    if (!sel?.anchorNode) return

    resolveSelection(sel)

    const cursor = props.doc.handleInput(input)
    if (!cursor) return

    // Reposition the DOM cursor after Solid has flushed its reactive updates.
    // queueMicrotask runs after the current synchronous work but before the
    // next paint, which is after Solid's store updates have been applied.
    queueMicrotask(() => {
      const el = document.getElementById(cursor.blockId)
      const textNode = el?.firstChild
      if (el) sel.collapse(textNode ?? el, cursor.offset)
    })
  }

  return (
    <div style="display: flex; gap: 16px; height: 100vh;">
      <div
        contenteditable
        onBeforeInput={handleBeforeInput}
        class="flex-1 min-h-0 overflow-y-auto flex flex-col border-1 p-2 whitespace-pre-wrap"
      >
        <For each={blocks}>{node => <BlockRenderer node={node} />}</For>
      </div>
      <div style="flex: 1; overflow-y: auto;">
        <PieceTableDebug blocks={blocks} />
      </div>
    </div>
  )
}
