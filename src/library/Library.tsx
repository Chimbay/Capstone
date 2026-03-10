import { DocumentAPI } from '@api/document'
import { useToast } from '@ui/toast/ToastContext'
import { SquareMenu } from 'lucide-solid'
import { createResource, createSignal, Show } from 'solid-js'
import DropBox from './DropBox'
import LibraryGallery from './LibraryGallery'
import LibraryList from './LibraryList'

export default function Library() {
  const [libraryView, setLibraryView] = createSignal(true)
  const { error } = useToast()

  const [list] = createResource(async () => {
    try {
      return await DocumentAPI.library_list()
    } catch (err) {
      error(err)
      throw err
    }
  })

  return (
    <div class="flex flex-col">
      <div class="flex w-full items-center justify-between">
        <h3>Your documents</h3>
        <button class="btn-ghost" onClick={() => setLibraryView(v => !v)}>
          <SquareMenu />
        </button>
      </div>
      <hr class="m-1" />
      <Show when={list()} fallback={<>Loading...</>}>
        <DropBox>
          {libraryView() ? (
            <LibraryGallery data={list()} />
          ) : (
            <LibraryList data={list()} />
          )}
        </DropBox>
      </Show>
    </div>
  )
}
