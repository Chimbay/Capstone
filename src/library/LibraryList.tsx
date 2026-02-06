import { useNavigate } from '@solidjs/router'
import { createSignal, For } from 'solid-js'
import { FileMetadata } from './types'

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
    <div onClick={open_file}>
      <span>{props.file.display_name}</span>
    </div>
  )
}
export default function LibraryList(props: { data: FileMetadata[] }) {
  return (
    <div class="flex flex-col">
      <For each={props.data}>{file => <Item file={file} />}</For>
    </div>
  )
}
