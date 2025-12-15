import { invoke } from '@tauri-apps/api/core'
import { useToast } from '@ui/toast/ToastContext'
import { createSignal, For, onMount } from 'solid-js'

async function book_names(): Promise<string[]> {
  return await invoke<string[]>('library_list')
}

export default function Library() {
  const { error } = useToast()

  const [list, setList] = createSignal<string[]>([])

  const loadData = async () => {
    try {
      const data = await book_names()
      setList(data)
    } catch (err: unknown) {
      if (err instanceof Error) {
        error(err.message)
      } else {
        error(JSON.stringify(err))
      }
    }
  }

  onMount(() => {
    void loadData()
  })

  return (
    <div class="grid">
      <For each={list()}>{s => <>{s}</>}</For>
    </div>
  )
}
