import { invoke } from '@tauri-apps/api/core'
import { error } from '@tauri-apps/plugin-log'
import { createSignal, For, onMount } from 'solid-js'

// Passes the string of the file to R
function read_file(selected_file: string) {
  void invoke('debug_pdf_to_text', {
    file: selected_file
  }).catch((err: string) => {
    void error(`Error loading file: ${err}`)
  })
}

function file_input(selected_file: string) {

  if (!selected_file) return
  void read_file(selected_file)
}

async function results(): Promise<string[]> {
  return await invoke<string[]>('debug_obtain_inputs')
}

function FileDebugButton(props: { file: string }) {
  return <button class={'border m-1'} onClick={() => void file_input(props.file)}>title</button>
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
