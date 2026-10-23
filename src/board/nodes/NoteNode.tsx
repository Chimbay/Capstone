import { DocumentAPI } from '@api/document'
import { NodeResizer, type NodeProps } from '@dschz/solid-flow'
import { useNavigate } from '@solidjs/router'
import { createResource, For, Show } from 'solid-js'
import type { NoteData } from '../boardFile'
import { useBoard } from '../context'
import { previewBlocks } from '../notePreview'
import Sides from './Sides'

// Compact styles for the editor's block tags; the card is too small for document sizes.
const blockClass: Record<string, string> = {
  h1: 'font-sans font-bold text-zinc-950 dark:text-white',
  h2: 'font-sans font-bold text-zinc-950 dark:text-white',
  h3: 'font-sans font-bold text-zinc-950 dark:text-white',
  h4: 'font-sans font-semibold text-zinc-950 dark:text-white',
  h5: 'font-sans font-semibold text-zinc-950 dark:text-white',
  h6: 'font-sans font-semibold text-zinc-950 dark:text-white',
  li: "pl-3 before:-ml-3 before:content-['•_']"
}

export default function NoteNode(props: NodeProps<NoteData, 'note'>) {
  const navigate = useNavigate()
  const board = useBoard()
  // Linked, not copied: name and text are read from the note file each time the board opens,
  // so a note renamed or edited elsewhere shows up current. The saved title is only a fallback.
  const [info] = createResource(
    () => props.data.note,
    uuid => DocumentAPI.file_info(uuid)
  )
  return (
    <div
      class="flex h-full w-full flex-col overflow-hidden rounded-[10px] border-[1.5px] border-zinc-950 p-2 dark:border-white"
      on:dblclick={() => navigate(`/view/${props.data.note}`)}
      title="Double-click to open the note"
    >
      <NodeResizer
        visible={props.selected}
        minWidth={120}
        minHeight={60}
        onResizeEnd={() => board.commit()}
      />
      <Sides />
      <div class="flex items-center gap-1.5 text-sm font-bold text-zinc-950 dark:text-white">
        {/* Page-with-folded-corner icon: the cue that this card links a note */}
        <svg
          class="size-3.5 shrink-0 fill-none stroke-current stroke-[1.5]"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M3.5 1.5h6l3 3v10h-9zM9.5 1.5v3h3" stroke-linejoin="round" />
        </svg>
        <span class="truncate">{info()?.name ?? props.data.title}</span>
      </div>
      <div class="min-h-0 overflow-hidden font-mono text-xs [overflow-wrap:anywhere] text-zinc-800 dark:text-zinc-200">
        <Show
          when={!info.error}
          fallback={<span class="text-red-600 dark:text-red-400">Note not found</span>}
        >
          <For each={previewBlocks(info()?.content ?? '')}>
            {block => <p class={blockClass[block.tag] ?? ''}>{block.text}</p>}
          </For>
        </Show>
      </div>
    </div>
  )
}
