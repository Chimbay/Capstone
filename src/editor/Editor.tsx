import { For } from 'solid-js'
import BlockRenderer from './BlockRenderer'
import PieceTableDebug from './debug'
import { RenderDocument } from './render'
import { ElementNode } from './types'

export default function Editor(props: { doc: RenderDocument }) {
  const blocks = props.doc.getDocumentBlocks()

  function getActiveBlock(): ElementNode | undefined {
    const sel = document.getSelection()
    if (!sel?.anchorNode) return

    const el = (
      sel.anchorNode.nodeType === Node.TEXT_NODE
        ? sel.anchorNode.parentElement
        : (sel.anchorNode as HTMLElement)
    )?.closest('[id]')

    return props.doc.blockMap.get(el?.id)
  }

  function handleBeforeInput(input: InputEvent): void {
    input.preventDefault()

    const sel = document.getSelection()
    if (!sel?.anchorNode) return

    const block = getActiveBlock()
    if (!block) return

    const start = Math.min(sel.anchorOffset, sel.focusOffset)
    const end = Math.max(sel.anchorOffset, sel.focusOffset)

    props.doc.setSelectionState(sel.isCollapsed, block, start, end)
    const cursor = props.doc.handleInput(input)
    if (!cursor) return

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
