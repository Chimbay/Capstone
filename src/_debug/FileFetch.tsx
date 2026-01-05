import { DebugDocumentAPI } from '@api/debug.document'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, For, Show } from 'solid-js'

function FileDebugButton(props: { file: string }) {
  return (
    <button
      class={'border m-1'}
      onClick={() => void DebugDocumentAPI.debug_pdf_to_text(props.file)}
    >
      title
    </button>
  )
}

export default function FileFetch() {
  const { error } = useToast()
  const [list] = createResource(async () => {
    try {
      return await DebugDocumentAPI.debug_obtain_inputs()
    } catch (err) {
      error(err)
      return []
    }
  })

  return (
    <div class={''}>
      <h3>Files</h3>
      <Show when={list()} fallback={<>Loading...</>}>
        {item => <For each={item()}>{file => <FileDebugButton file={file} />}</For>}
      </Show>
    </div>
  )
}
