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
      class="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-gray-100"
    >
      <img src="/preview-a6.svg" class="aspect-[1/1.4] w-8 shrink-0" />
      <span class="truncate text-sm font-medium text-gray-800">
        {props.file.display_name}
      </span>
    </div>
  )
}

export default function LibraryList(props: { data: FileMetadata[] }) {
  return (
    <div>
      <CreateFile />
      <div class="mt-1 flex flex-col">
        <For each={props.data}>{file => <ListItem file={file} />}</For>
      </div>
    </div>
  )
}
