import { DocumentAPI } from '@api/document'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, createSignal, Show } from 'solid-js'
import DropBox from './DropBox'
import LibraryGallery from './LibraryGallery'
import LibraryList from './LibraryList'

export default function Library() {
  const [libraryView, setLibraryView] = createSignal(true)
  const error = useToast()

  const [list] = createResource(async () => {
    try {
      return await DocumentAPI.library_list()
    } catch (err) {
      error(err)
      throw err
    }
  })

  return (
    <>
      <h1>Library:</h1>
      <button onClick={() => setLibraryView(v => !v)}>Toggle</button>

      <Show when={list()} fallback={<>Loading...</>}>
        <DropBox>
          {libraryView() ? (
            <LibraryGallery data={list()} />
          ) : (
            <LibraryList data={list()} />
          )}
        </DropBox>
      </Show>
    </>
  )
}
