import { For } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import PieceTableDebug from './debug'
import { RenderDocument } from './render'
import { ElementNode } from './types'

export default function Editor(props: { doc: RenderDocument }) {
  const parsedDocument = props.doc.getDocumentBlocks()

  function getBlock(): ElementNode | undefined {
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

    const block = getBlock()
    if (!block) return

    const offset = sel.anchorOffset

    props.doc.setDocumentPosition(block, offset)
    props.doc.handleInput(input)
    
    
    queueMicrotask(() => {
      const el = document.getElementById(block.uuid)
      const textNode = el?.firstChild
      const cursor = props.doc.handleCursor(input)
      if (textNode) sel.collapse(textNode, cursor)
    })
  }

  return (
    <div style="display: flex; gap: 16px; height: 100vh;">
      <div
        contenteditable
        onBeforeInput={handleBeforeInput}
        style="flex: 1; padding: 16px; overflow-y: auto;"
      >
        <For each={parsedDocument}>
          {node => (
            <Dynamic component={node.tag} id={node.uuid}>
              {node.pieceTable.formatText()}
            </Dynamic>
          )}
        </For>
      </div>
      <div style="flex: 1; overflow-y: auto;">
        <PieceTableDebug blocks={parsedDocument} />
      </div>
    </div>
  )
}
