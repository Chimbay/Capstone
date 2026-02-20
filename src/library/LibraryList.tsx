import { useNavigate } from '@solidjs/router'
import { For } from 'solid-js'
import CreateFile from './CreateFile'
import { FileMetadata } from './types'

function ListItem(props: { file: FileMetadata }) {
  const navigate = useNavigate()

  function openFile() {
    navigate(`/view/${props.file.uuid}`, { replace: true })
  }

  return (
    <div
      onClick={openFile}
      class="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
    >
      <img src="/preview-a6.svg" class="w-8 aspect-[1/1.4] shrink-0" />
      <span class="text-sm font-medium text-gray-800 truncate">{props.file.display_name}</span>
    </div>
  )
}

export default function LibraryList(props: { data: FileMetadata[] }) {
  return (
    <div class="flex flex-col gap-1 p-4">
      <CreateFile />
      <For each={props.data}>{file => <ListItem file={file} />}</For>
    </div>
  )
}
