import { DocumentAPI } from '@api/document'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, For, Show } from 'solid-js'
import LibraryItem from './LibraryItem'

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
          {accessor => <For each={accessor()}>{file => <LibraryItem file={file} />}</For>}
        </Show>
      </div>
    </>
  )
}
