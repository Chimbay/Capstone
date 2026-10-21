import { DocumentAPI } from '@api/document'
import type { NodeProps } from '@dschz/solid-flow'
import { useNavigate } from '@solidjs/router'
import { createResource, Show } from 'solid-js'
import type { NoteData } from '../boardFile'
import Sides from './Sides'

// First lines of a note's body, without its front matter.
function preview(markdown: string): string {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    .trim()
    .split('\n')
    .slice(0, 3)
    .join('\n')
}

export default function NoteNode(props: NodeProps<NoteData, 'note'>) {
  const navigate = useNavigate()
  // Linked, not copied: the body is read from the note file each time the board opens.
  // shortcut: the title is cached at drop time, so renaming the note file leaves the old title here.
  const [body] = createResource(
    () => props.data.note,
    uuid => DocumentAPI.file_read_by_uuid(uuid)
  )
  return (
    <div
      class="flex h-[100px] w-[220px] flex-col overflow-hidden rounded-lg border border-amber-300 bg-amber-50 p-2 shadow-sm"
      on:dblclick={() => navigate(`/view/${props.data.note}`)}
      title="Double-click to open the note"
    >
      <Sides />
      <div class="truncate text-sm font-semibold text-gray-800">{props.data.title}</div>
      <div class="text-xs whitespace-pre-line text-gray-600">
        <Show
          when={!body.error}
          fallback={<span class="text-red-600">Note not found</span>}
        >
          {preview(body() ?? '')}
        </Show>
      </div>
    </div>
  )
}
