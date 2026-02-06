import { useNavigate } from '@solidjs/router'
import { createSignal, For, Show } from 'solid-js'
import type { FileMetadata } from './types'

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
export default function LibraryGallery(props: { data: FileMetadata[] }) {
  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      <For each={props.data}>{file => <Item file={file} />}</For>
    </div>
  )
}
