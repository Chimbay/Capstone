import { DocumentAPI } from '@api/document'
import { useNavigate } from '@solidjs/router'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, For, Show } from 'solid-js'

interface FileMetadata {
  uuid: string
  display_name: string
  path: string
  created: string
  modified: string
}

function ItemInfo(props: { data: FileMetadata }) {
  return <>{JSON.stringify(props.data)}</>
}
function Item(props: { file: FileMetadata }) {
  const navigate = useNavigate()
  function open_file() {
    navigate(`/view/${props.file.uuid}`, { replace: true })
  }
  return (
    <>
      <>{<ItemInfo data={props.file} />}</>
      <button class="border 1px" onClick={open_file}>
        {props.file.display_name}
      </button>
    </>
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
