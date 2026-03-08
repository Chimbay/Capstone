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

  void listen('menu:save', () => {
    const content = serialize(document.getDocumentBlocks())
    void DocumentAPI.file_save(props.uuid, content)
  }).then(unlisten => onCleanup(() => unlisten()))

  return (
    <div>
      <div class="bg-gray-200">
        <button class="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow">
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
      return DocumentAPI.file_read_by_uuid(params.uuid)
    } catch (err: unknown) {
      error(String(err))
    }
  })

  return (
    <div>
      <Show when={data()} fallback={<>Loading...</>}>
        {accessor => <Processor text={accessor()} uuid={params.uuid} />}
      </Show>
    </div>
  )
}
