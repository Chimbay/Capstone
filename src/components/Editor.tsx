import { invoke } from '@tauri-apps/api/core'
import { useToast } from '@ui/toast/ToastContext'
import { createSignal, For, JSX, onMount } from 'solid-js'

async function gather_text() {
  return await invoke<string>('md_to_text', { path: 'example.md' })
}

type TextSpan = {
  id: string
  text: string
}

type Document = {
  spans: TextSpan[]
}
type Cursor = {
  spanIndex: number
  offset: number
}

const SpanDataMap = new WeakMap<HTMLElement, TextSpan>()
function Doc() {
  const [text, setText] = createSignal<Document>({ spans: [] })
  const [cursor, setCursor] = createSignal<Cursor>({
    spanIndex: 0,
    offset: 0
  })
  const { error } = useToast()

  const loadText = async () => {
    try {
      const data: TextSpan = {
        id: crypto.randomUUID(),
        text: await gather_text(),
      }
      const doc: Document = {
        spans: [data]
      }
      setText(doc)
    } catch (err: unknown) {
      error(err)
    }
  }
  onMount(() => {
    void loadText()
  })

  function split_text(node: TextSpan, sel: Selection) {
    const offset = sel.anchorOffset

    setText(prev => {
      const index = prev.spans.findIndex(s => s.id === node.id)
      if (index === -1) return prev

      const left: TextSpan = {
        id: node.id,
        text: node.text.slice(0, offset)
      }

      const right: TextSpan = {
        id: crypto.randomUUID(),
        text: node.text.slice(offset),
      }


      const spans = [...prev.spans]
      spans.splice(index, 1, left, right)

      return { ...prev, spans }
    })
  }

  function handleInput(e: InputEvent) {
    e.preventDefault()

    console.log(e.target)

    const sel = document.getSelection()
    console.log(sel)
  }
  function update_cursor(el: HTMLElement, sel: Selection) {
    const parent = el.parentElement
    if (parent) {
      const children = Array.from(parent.children)
      const index = children.indexOf(el)

      setCursor(prev => ({
        ...prev,
        offset: sel.anchorOffset,
        spanIndex: index
      }))
      console.log('in here')
    }
  }
  function handleClick(e: MouseEvent) {
    const el = e.target as HTMLElement
    const sel = document.getSelection()
    update_cursor(el, sel)
    const span = SpanDataMap.get(el)
    split_text(span, sel)
  }

  return (
    <>
      <div onClick={handleClick} contenteditable onBeforeInput={handleInput}>
        <For each={text().spans} fallback={<>Loading..</>}>
          {(t, _) => (
            <p
              ref={el => {
                if (el) SpanDataMap.set(el, t)
              }}
              data-id={t.id}
            >
              {t.text}
            </p>
          )}
        </For>
      </div>

      <pre>
        {JSON.stringify(
          {
            spans: text().spans.map(({ prev, next, ...rest }) => rest)
          },
          null,
          2
        )}
      </pre>
      <pre>{JSON.stringify(cursor(), null, 2)}</pre>
    </>
  )
}

export default function Editor() {
  return (
    <div>
      <div class="bg-gray-200">a</div>

      <Doc />
    </div>
  )
}
