import { For } from 'solid-js'
import { Dynamic } from 'solid-js/web'
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
    props.doc.handleInput(input)

    const cursorOffset = props.doc.computeCursorOffset(input)
    queueMicrotask(() => {
      const el = document.getElementById(block.uuid)
      const textNode = el?.firstChild
      if (textNode) sel.collapse(textNode, cursorOffset)
    })
  }

  return (
    <div style="display: flex; gap: 16px; height: 100vh;">
      <div
        contenteditable
        onBeforeInput={handleBeforeInput}
        style="flex: 1; padding: 16px; overflow-y: auto; white-space: pre-wrap;"
      >
        <For each={blocks}>
          {node => (
            <Dynamic component={node.tag} id={node.uuid}>
              {node.pieceTable.formatText()}
            </Dynamic>
          )}
        </For>
      </div>
      <div style="flex: 1; overflow-y: auto;">
        <PieceTableDebug blocks={blocks} />
      </div>
    </div>
  )
}
