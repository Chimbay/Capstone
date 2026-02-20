import { DocumentAPI } from '@api/document'
import { useNavigate } from '@solidjs/router'
import { createSignal, For, Show } from 'solid-js'
import CreateFile from './CreateFile'
import type { FileMetadata } from './types'

function ItemInfo(props: { data: FileMetadata }) {
  function deleteFile() {
    void DocumentAPI.delete_file(props.data)
  }

  return (
    <div class="absolute bg-white border p-2 shadow-lg rounded">
      <ul>
        <li>Created: {props.data.created}</li>
        <li>Path: {props.data.path}</li>
        <button
          class="hover:border-gray-400 hover:shadow-md transition-all cursor-pointer overflow-hidden"
          onClick={deleteFile}
        >
          Delete
        </button>
      </ul>
    </div>
  )
}

function GalleryItem(props: { file: FileMetadata }) {
  const [showInfo, setShowInfo] = createSignal(false)
  const navigate = useNavigate()

  function openFile() {
    navigate(`/view/${props.file.uuid}`, { replace: true })
  }

  return (
    <div class="relative group flex flex-col rounded-lg border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all cursor-pointer overflow-hidden">
      <div
        onClick={() => setShowInfo(v => !v)}
        class="absolute top-2 right-2 text-xs text-gray-400 hover:text-gray-700 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ⋯
      </div>
      <Show when={showInfo()}>
        <ItemInfo data={props.file} />
      </Show>
      <div class="flex flex-col items-center gap-2 p-4" onClick={openFile}>
        <img src="/preview-a6.svg" class="w-20 aspect-[1/1.4] object-cover" />
        <span class="text-sm font-medium text-gray-800 text-center truncate w-full">
          {props.file.display_name}
        </span>
      </div>
    </div>
  )
}

export default function LibraryGallery(props: { data: FileMetadata[] }) {
  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      <CreateFile />
      <For each={props.data}>{file => <GalleryItem file={file} />}</For>
    </div>
  )
}
