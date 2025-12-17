import { invoke } from '@tauri-apps/api/core'
import { useToast } from '@ui/toast/ToastContext'
import { stringify } from 'querystring'
import { createSignal, For, onMount } from 'solid-js'

async function gather_text() {
  return await invoke<string>('md_to_text', { path: 'example.md' })
}

type TextSpan = {
  text: string
  bold?: boolean
  highlight?: 'yellow' | 'green'
}

export default function Editor() {
  const [text, setText] = createSignal<TextSpan[]>([])
  const { error } = useToast()

  const loadText = async () => {
    try {
      const data: TextSpan = {
        text: await gather_text()
      }
      setText([data])

    } catch (err: unknown) {
      error(err)
    }
  }
  onMount(() => {
    void loadText()
  })

  function seperate_text(offset: number) {
    let span = text()[0].text
    let cut = span.slice(offset)

  }

  function handle_before_input(e: InputEvent) {
    if (e.inputType === 'insertParagraph') {
      const sel = window.getSelection()
      const offSet = sel.anchorOffset
      console.log(sel.anchorOffset)
      seperate_text(offSet)
    }
  }

  return (
    <div>
      <div class="bg-gray-200">a</div>
      <div contentEditable onBeforeInput={handle_before_input}>
        <For each={text()}>
            {(t, index) => (
                <span data-span-index={index()}>{t.text}</span>
            )}
        </For>
      </div>
      <pre>{JSON.stringify(text(), null, 2)}</pre>
    </div>
  )
}
