import { DocumentAPI } from '@api/document'
import { useNavigate } from '@solidjs/router'
import { createSignal, For, Show } from 'solid-js'
import Card from './Card'
import CreateFile from './CreateFile'
import type { FileMetadata } from './types'

function ItemInfo(props: { data: FileMetadata }) {
  function deleteFile() {
    void DocumentAPI.delete_file(props.data)
  }

  return (
    <div class="absolute rounded border bg-white p-2 shadow-lg">
      <ul>
        <li>Created: {props.data.created}</li>
        <li>Path: {props.data.path}</li>
        <button class="btn-ghost" onClick={deleteFile}>
          Delete
        </button>
      </ul>
    </div>
  )
}

function GalleryItem(props: { file: FileMetadata }) {
  const [showInfo, setShowInfo] = createSignal(false)
  const navigate = useNavigate()

  function open_file() {
    navigate(`/view/${props.file.uuid}`, { replace: true })
  }

  return (
    <Card onClick={open_file}>
      <button
        class="btn-ghost absolute top-1 right-2 z-50"
        onClick={e => {
          e.stopPropagation()
          setShowInfo(v => !v)
        }}
      >
        ...
      </button>
      <Show when={showInfo()}>
        <ItemInfo data={props.file} />
      </Show>
      <div class="flex flex-col items-center gap-2">
        <img class="w-10" src="preview-a6.svg" />
        <span class="w-full truncate px-2 text-sm">{props.file.display_name}</span>
      </div>
    </Card>
  )
}

export default function LibraryGallery(props: { data: FileMetadata[] }) {
  return (
    <div class="grid grid-cols-3 justify-items-center gap-3 md:grid-cols-4 lg:grid-cols-5">
      <div class="col-span-3 flex items-center justify-center justify-self-stretch md:col-span-1 md:justify-self-auto">
        <CreateFile class='md:aspect-square md:h-30 md:w-30'/>
      </div>

      <For each={props.data}>{file => <GalleryItem file={file} />}</For>
    </div>
  )
}
