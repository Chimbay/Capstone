import { DocumentAPI } from '@api/document'
import { useParams } from '@solidjs/router'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, createSignal, Show } from 'solid-js'

interface DomPiece {
  buffer: string
  start: number
  len: number
}

const debounce = <T extends (...args: unknown[]) => void>(callback: T, wait: number) => {
  let timeoutID: number | null = null
  return (...args: Parameters<T>) => {
    window.clearTimeout(timeoutID)
    timeoutID = window.setTimeout(() => {
      callback(...args)
    }, wait)
  }
}

function Doc(props: { text: string }) {
  const [cursor, setCursor] = createSignal({
    spanIndex: 0,
    offset: 0
  })
  const [initialRender] = createResource(() => {
    void DocumentAPI.init_document(props.text)
    return props.text
  })
  const [pieceTable, { refetch }] = createResource(() => {
    return DocumentAPI.get_table()
  })
  const [buffer, setBuffer] = createSignal()
  const buffer_list: DomPiece[] = []

  function get_cursor(el: HTMLElement) {
    const parent = el.parentElement
    const anchorOffset = document.getSelection().anchorOffset
    const children = Array.from(parent.children)
    const index = children.indexOf(el)

    setCursor(prev => ({
      ...prev,
      offset: anchorOffset,
      spanIndex: index
    }))
  }
  function handleClick(e: MouseEvent) {
    const el = e.target as HTMLElement
    const sel = document.getSelection()
    get_cursor(el)
  }

  const debouncedUpdate = debounce(() => {
    for (const p of buffer_list) {
      void DocumentAPI.insert_text(p.start, p.buffer)
    }
    void refetch()
  }, 1500)

  function handleInput(e: InputEvent) {
    const type = e.inputType
    let piece: DomPiece = {
      buffer: '',
      start: cursor().offset,
      len: 0
    }

    switch (type) {
      case 'insertText':
        {
          // If buffer is empty
          if (buffer_list.length == 0) {
            piece.buffer += e.data
            piece.len = piece.buffer.length
            buffer_list.push(piece)
          } else if (buffer_list.at(-1).start == cursor().offset) {
            piece = buffer_list.at(-1)
            piece.buffer += e.data
            piece.len = piece.buffer.length
            buffer_list[buffer_list.length - 1] = piece
          } else {
            piece.buffer += e.data
            piece.len = piece.buffer.length
            buffer_list.push(piece)
          }

          setBuffer([...buffer_list])
        }
        break
      case 'deleteContentBackward':
        // delete
        break
    }

    debouncedUpdate()
  }

  return (
    <>
      <div onClick={handleClick} contenteditable onBeforeInput={handleInput}>
        <span>{initialRender()}</span>
      </div>
      <pre>Buffer: {JSON.stringify(buffer(), null, 2)}</pre>
      <pre>{JSON.stringify(cursor(), null, 2)}</pre>
      <pre>{JSON.stringify(pieceTable(), null, 2)}</pre>
    </>
  )
}

// Just selection for now
const EditorButtons = {
  highlight(e: MouseEvent): void {
    const sel = document.getSelection()
    if (!sel || sel.rangeCount === 0) return

    const range = sel.getRangeAt(0)

    if (range.collapsed) return

    const { startContainer, endContainer, startOffset, endOffset } = range

    if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = startContainer as Text
      const selectedText = textNode.textContent?.slice(startOffset, endOffset)

      if (!selectedText) return

      // Create highlighted span
      const highlightSpan = document.createElement('span')
      highlightSpan.textContent = selectedText
      highlightSpan.className = 'bg-yellow-200'

      const beforeText = textNode.textContent?.slice(0, startOffset) || ''
      const afterText = textNode.textContent?.slice(endOffset) || ''

      const parent = textNode.parentElement
      if (!parent) return

      const beforeNode = document.createTextNode(beforeText)
      const afterNode = document.createTextNode(afterText)

      parent.insertBefore(beforeNode, textNode)
      parent.insertBefore(highlightSpan, textNode)
      parent.insertBefore(afterNode, textNode)
      parent.removeChild(textNode)

      sel.removeAllRanges()
    }
  }
}

export default function Editor() {
  const params: { file_name: string } = useParams<{ file_name }>()
  const { error } = useToast()
  const [data] = createResource(async () => {
    try {
      return DocumentAPI.md_to_text(params.file_name)
    } catch (err: unknown) {
      error(String(err))
    }
  })

  return (
    <div>
      <div class="bg-gray-200">
        <button
          class="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
          onclick={EditorButtons.highlight}
        >
          Highlight
        </button>
      </div>
      <Show when={data()} fallback={<>Loading...</>}>
        {text => <Doc text={text()} />}
      </Show>
    </div>
  )
}
