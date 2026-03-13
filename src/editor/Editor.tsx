import { For } from 'solid-js'
import BlockRenderer from './BlockRenderer'
import PieceTableDebug from './debug'
import { handleKeys } from './handler/handler'
import { RenderDocument } from './render'
import { ElementNode, SelectionNode } from './types'

export default function Editor(props: { doc: RenderDocument }) {
  const blocks = props.doc.getDocumentBlocks()

  // Walks up the DOM to find the nearest block element by id.
  function getBlockFromNode(node: Node): ElementNode | undefined {
    const el = (
      node.nodeType === Node.TEXT_NODE
        ? (node as Text).parentElement
        : (node as HTMLElement)
    )?.closest('[id]')
    return props.doc.blockMap.get(el?.id ?? '')
  }

  function resolveSelection(sel: Selection): void {
    if (!sel?.anchorNode) return
    const anchorBlock = getBlockFromNode(sel.anchorNode)
    const focusBlock = getBlockFromNode(sel.focusNode)
    if (!anchorBlock || !focusBlock) return

    const anchor: SelectionNode = { block: anchorBlock, offset: sel.anchorOffset }
    const focus: SelectionNode = { block: focusBlock, offset: sel.focusOffset }
    props.doc.setSelectionState(anchor, focus)
  }

  function dispatch(inputType: string, data?: string): void {
    const sel = document.getSelection()
    if (!sel?.anchorNode) return
    resolveSelection(sel)

    const cursor = props.doc.handleInput(inputType, data)
    if (!cursor) return

    queueMicrotask(() => {
      const el = document.getElementById(cursor.block.uuid)
      const textNode = el?.firstChild
      if (el) sel.collapse(textNode ?? el, cursor.offset)
    })
  }

  function handleKeyDown(e: KeyboardEvent): void {
    const result = handleKeys(e)
    if (!result) return
    e.preventDefault()
    dispatch(result.inputType, result.data)
  }

  function handlePaste(e: ClipboardEvent): void {
    e.preventDefault()
    dispatch('insertFromPaste', e.clipboardData?.getData('text/plain'))
  }

  return (
    <div style="display: flex; gap: 16px; height: 100vh;">
      <div
        contenteditable
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        class="flex min-h-0 flex-1 flex-col overflow-y-auto border-1 p-2 whitespace-pre-wrap"
      >
        <For each={blocks}>{node => <BlockRenderer node={node} />}</For>
      </div>
      {/*<div style="flex: 1; overflow-y: auto;">
        <PieceTableDebug blocks={blocks} />
      </div>*/}
    </div>
  )
}
