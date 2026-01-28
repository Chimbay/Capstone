import { useNavigate } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'
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

export default function LibraryItem(props: { file: FileMetadata }) {
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
