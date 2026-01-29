import { DocumentAPI } from '@api/document'
import Editor from '@editor/Editor'
import { PieceTable } from '@editor/PieceTable'
import { useParams } from '@solidjs/router'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, Show } from 'solid-js'

function Processor(props: { text: string }) {
  const pieceTable = new PieceTable(props.text)

  return (
    <>
      <div class="bg-gray-200">
        <button class="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow">
          Highlight
        </button>
      </div>
      <div class="mx-20">
        <Editor table={pieceTable} />
      </div>
    </>
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
        {accessor => <Processor text={accessor()} />}
      </Show>
    </div>
  )
}
