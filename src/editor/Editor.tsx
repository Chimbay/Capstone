import { For } from 'solid-js'
import { Dynamic } from 'solid-js/web'
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

    // Restore cursor after Solid re-renders the block
    queueMicrotask(() => {
      const el = document.getElementById(block.uuid)
      const textNode = el?.firstChild
      if (textNode) {
        sel.collapse(textNode, offset + (input.data?.length ?? 0))
      }
    })
  }

  return (
    <div contenteditable onBeforeInput={handleBeforeInput}>
      <For each={parsedDocument}>
        {node => (
          <Dynamic component={node.tag} id={node.uuid}>
            {node.pieceTable.formatText()}
          </Dynamic>
        )}
      </For>
    </div>
  )
}
