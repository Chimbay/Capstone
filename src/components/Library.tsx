import { A, useNavigate } from '@solidjs/router'
import { invoke } from '@tauri-apps/api/core'
import { useToast } from '@ui/toast/ToastContext'
import { createSignal, For, onMount } from 'solid-js'

async function book_names(): Promise<string[]> {
  return await invoke<string[]>('library_list')
}

function LibraryOption(props: { fileName: string }) {
  const navigate = useNavigate()
  console.log(props.fileName)
  function open_file() {
    navigate(`/editor/${props.fileName}`, { replace: true })
  }

  return (
    <button class="border 1px" onClick={open_file}>
      {props.fileName}
    </button>
  )
}

export default function Library() {
  const error = useToast()

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
      <h1>Library:</h1>
      <For each={list()}>{s => <LibraryOption fileName={s} />}</For>
    </div>
  )
}
