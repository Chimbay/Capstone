import { DocumentAPI } from '@api/document'
import { useNavigate } from '@solidjs/router'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, createSignal, For, Show } from 'solid-js'

interface FileMetadata {
  uuid: string
  display_name: string
  path: string
  created: string
  modified: string
}

function ItemInfo(props: { data: FileMetadata }) {
  return (
    <div class="absolute bg-white border p-2 shadow-lg rounded">
      <ul>
        <li>{JSON.stringify(props.data, null, 2)}</li>
      </ul>
    </div>
  )
}
function Item(props: { file: FileMetadata }) {
  const [showInfo, setShowInfo] = createSignal(false)
  const navigate = useNavigate()

  function open_file() {
    navigate(`/view/${props.file.uuid}`, { replace: true })
  }
  return (
    <div class="relative border 1p">
      <div class="" onClick={() => setShowInfo(!showInfo())}>
        Info
      </div>
      <Show when={showInfo()}>
        <ItemInfo data={props.file} />
      </Show>
      <div class="flex flex-col items-center" onClick={open_file}>
        <img
          src="/preview-a6.svg"
          class="justify-center items-center w-25 aspect-[1/1.4] p-1"
        />
        {props.file.display_name}
      </div>
    </div>
  )
}

export default function Library() {
  const error = useToast()

  const [list] = createResource(() => {
    try {
      return DocumentAPI.library_list()
    } catch (err: unknown) {
      error(err)
    }
  })

  return (
    <>
      <h1>Library:</h1>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        <Show when={list()} fallback={<>Loading...</>}>
          {accessor => <For each={accessor()}>{file => <Item file={file} />}</For>}
        </Show>
      </div>
    </>
  )
}
