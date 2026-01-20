import { DocumentAPI } from '@api/document'
import { useNavigate } from '@solidjs/router'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, For, Show } from 'solid-js'

function LibraryOption(props: { fileName: string }) {
  const navigate = useNavigate()
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
          {accessor => {
            console.log('Library data:', accessor().meta_data)
            return (
              <For each={accessor().paths}>
                {page => <LibraryOption fileName={page} />}
              </For>
            )
          }}
        </Show>
      </div>
    </>
  )
}
