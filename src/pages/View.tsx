import { DocumentAPI } from '@api/document'
import Editor from '@editor/Editor'
import { RenderDocument } from '@editor/render'
import { serialize } from '@editor/serialize'
import { useParams } from '@solidjs/router'
import { listen } from '@tauri-apps/api/event'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, onCleanup, Show } from 'solid-js'

function Processor(props: { text: string; uuid: string }) {
  const document = new RenderDocument(props.text)

  const unlisten = listen('menu:save', () => {
    const content = serialize(document.getDocumentBlocks())
    void DocumentAPI.file_save(props.uuid, content)
  })
  // Registered synchronously: onCleanup inside .then() runs outside the component and never fires
  onCleanup(() => void unlisten.then(off => off()))

  return (
    <div>
      <div class="bg-gray-200">
        <button class="rounded border border-gray-400 bg-white px-4 py-2 font-semibold text-gray-800 shadow hover:bg-gray-100">
          Highlight
        </button>
      </div>
      <div class="mx-20">
        <Editor doc={document} />
      </div>
    </div>
  )
}

export default function View() {
  const params: { uuid: string } = useParams<{
    uuid: string
  }>()
  const { error } = useToast()
  const [data] = createResource(async () => {
    try {
      return await DocumentAPI.file_read_by_uuid(params.uuid)
    } catch (err: unknown) {
      error(err as string) // Rust errors serialize to plain strings
    }
  })

  return (
    <Show when={data()} fallback={<>Loading...</>}>
      {accessor => <Processor text={accessor()} uuid={params.uuid} />}
    </Show>
  )
}
