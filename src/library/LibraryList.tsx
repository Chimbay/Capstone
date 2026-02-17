import { useNavigate } from '@solidjs/router'
import { For } from 'solid-js'
import { FileMetadata } from './types'
import CreateFile from './CreateFile'

function ListItem(props: { file: FileMetadata }) {
  const navigate = useNavigate()

  function openFile() {
    navigate(`/view/${props.file.uuid}`, { replace: true })
  }

  return (
    <div onClick={openFile}>
      <span>{props.file.display_name}</span>
    </div>
  )
}

export default function LibraryList(props: { data: FileMetadata[] }) {
  return (
    <div class="flex flex-col">
      <CreateFile />
      <For each={props.data}>{file => <ListItem file={file} />}</For>
    </div>
  )
}
