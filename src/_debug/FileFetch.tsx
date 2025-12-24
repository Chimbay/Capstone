import { DocumentAPI } from '@api/document'
import { invoke } from '@tauri-apps/api/core'
import { createSignal, For, onMount } from 'solid-js'

// Passes the string of the file to R

function file_input(selected_file: string) {
  if (!selected_file) return
  void DocumentAPI.read_file(selected_file)
}

async function results(): Promise<string[]> {
  return await invoke<string[]>('debug_obtain_inputs')
}

function FileDebugButton(props: { file: string }) {
  return (
    <button class={'border m-1'} onClick={() => void file_input(props.file)}>
      title
    </button>
  )
}

export default function FileFetch() {
  const [list, setList] = createSignal<string[]>([])

  const loadData = async () => {
    const data = await results()
    setList(data)
  }
  onMount(() => {
    void loadData()
  })

  return (
    <div class={''}>
      <h3>Files</h3>
      <For each={list()}>{file => <FileDebugButton file={file} />}</For>
    </div>
  )
}
