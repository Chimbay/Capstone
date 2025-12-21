import { useParams } from '@solidjs/router'
import { invoke } from '@tauri-apps/api/core'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, createSignal, onMount, Show } from 'solid-js'

async function gather_text(file: string): Promise<string> {
  return await invoke<string>('md_to_text', { path: file })
}

type TextSpan = {
  text: string
}
type Cursor = {
  spanIndex: number
  offset: number
}

function Doc(props: { text: string }) {
  const { error } = useToast()
  const [cursor, setCursor] = createSignal<Cursor>({
    spanIndex: 0,
    offset: 0
  })
  const [initialRender, setInitialRender] = createSignal<TextSpan>()

  onMount(() => {
    setInitialRender({
      text: props.text
    })
  })
  function handleInput(e: InputEvent) {
    e.preventDefault()

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
    }
  }
  function handleClick(e: MouseEvent) {
    const el = e.target as HTMLElement
    const sel = document.getSelection()
    update_cursor(el, sel)
  }

  return (
    <>
      <div onClick={handleClick} contenteditable onBeforeInput={handleInput}>
        <p>{initialRender() && initialRender().text}</p>
      </div>
      <pre>{JSON.stringify(cursor(), null, 2)}</pre>
    </>
  )
}

export default function Editor() {
  const params: { text: string } = useParams<{ text: string }>()
  const { error } = useToast()
  const [data] = createResource(async () => {
    try {
      return await gather_text(params.text)
    } catch (err: unknown) {
      error(err)
    }
  })

  return (
    <div>
      <div class="bg-gray-200">Editor toolbar</div>
      <Show when={data()} fallback={<>Loading...</>}>
        {text => <Doc text={text()} />}
      </Show>
    </div>
  )
}
