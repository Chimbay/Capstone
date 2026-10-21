import type { TreeNode } from '@api/types'
import { NOTE_MIME } from '@board/Board'
import { useNavigate } from '@solidjs/router'
import { FileText, Folder, FolderOpen, LayoutDashboard, X } from 'lucide-solid'
import { createSignal, For, Show } from 'solid-js'

export interface TreeProps {
  nodes: TreeNode[]
  selected: string
  // Keyed by path so expansion survives the refetch after every change.
  isOpen: (path: string) => boolean
  onSelectFolder: (path: string) => void
  onDelete: (node: TreeNode) => void
}

function Row(props: TreeProps & { node: TreeNode; depth: number }) {
  const navigate = useNavigate()
  // Deleting is permanent on disk, so it takes two clicks.
  const [armed, setArmed] = createSignal(false)
  const isFolder = () => props.node.children !== null
  const isBoard = () => props.node.path.endsWith('.board.json')
  const isNote = () => !isFolder() && !isBoard()

  function open(): void {
    if (isFolder()) props.onSelectFolder(props.node.path)
    else navigate(`/${isBoard() ? 'board' : 'view'}/${props.node.uuid}`)
  }

  return (
    <>
      <div
        class="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-100"
        classList={{ 'bg-gray-200': isFolder() && props.selected === props.node.path }}
        style={{ 'padding-left': `${props.depth * 16 + 8}px` }}
        onClick={open}
        onMouseLeave={() => setArmed(false)}
        // Notes can be dragged onto an open board
        draggable={isNote()}
        onDragStart={e =>
          e.dataTransfer?.setData(NOTE_MIME, JSON.stringify({ note: props.node.uuid, title: props.node.name }))
        }
      >
        <Show
          when={isFolder()}
          fallback={
            <Show when={isBoard()} fallback={<FileText size={16} class="shrink-0 text-gray-500" />}>
              <LayoutDashboard size={16} class="shrink-0 text-blue-500" />
            </Show>
          }
        >
          <Show
            when={props.isOpen(props.node.path)}
            fallback={<Folder size={16} class="shrink-0 text-gray-500" />}
          >
            <FolderOpen size={16} class="shrink-0 text-gray-500" />
          </Show>
        </Show>
        <span class="flex-1 truncate">{props.node.name}</span>
        <button
          class="btn-ghost px-1 text-xs text-gray-500 opacity-0 group-hover:opacity-100"
          classList={{ 'text-red-600 opacity-100': armed() }}
          aria-label={`Delete ${props.node.name}`}
          onClick={e => {
            e.stopPropagation()
            if (armed()) props.onDelete(props.node)
            else setArmed(true)
          }}
        >
          <Show when={armed()} fallback={<X size={14} />}>
            Delete?
          </Show>
        </button>
      </div>
      <Show when={isFolder() && props.isOpen(props.node.path)}>
        <For each={props.node.children}>
          {child => <Row {...props} node={child} depth={props.depth + 1} />}
        </For>
      </Show>
    </>
  )
}

export default function Tree(props: TreeProps) {
  return (
    <For each={props.nodes}>{node => <Row {...props} node={node} depth={0} />}</For>
  )
}
