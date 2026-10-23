import type { TreeNode } from '@api/types'
import { NOTE_MIME } from '@board/Board'
import { useNavigate } from '@solidjs/router'
import { useToast } from '@ui/toast/ToastContext'
import {
  FileText,
  Folder,
  FolderOpen,
  LayoutDashboard,
  TriangleAlert
} from 'lucide-solid'
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

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
  let row!: HTMLDivElement
  const [menu, setMenu] = createSignal<{ x: number; y: number }>()
  const { error } = useToast()
  const isFolder = () => props.node.children !== null
  const broken = () => props.node.error !== null
  const isBoard = () => props.node.path.endsWith('.board.json')
  const isNote = () => !isFolder() && !isBoard() && !broken()

  function open(): void {
    if (isFolder()) props.onSelectFolder(props.node.path)
    // A broken file has no id to open; explain instead, so it can be fixed or removed outside the app.
    else if (broken()) error(`${props.node.path} ${props.node.error}`)
    else navigate(`/${isBoard() ? 'board' : 'view'}/${props.node.uuid}`)
  }

  return (
    <>
      <div
        ref={row}
        tabIndex={0}
        class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
        classList={{
          'bg-gray-200 dark:bg-indigo-900/40':
            isFolder() && props.selected === props.node.path,
          'text-red-700 dark:text-red-400': broken()
        }}
        title={broken() ? `Can't open: ${props.node.error}` : undefined}
        style={{ 'padding-left': `${props.depth * 16 + 8}px` }}
        onClick={open}
        onKeyDown={e => e.key === 'Enter' && open()}
        onContextMenu={e => {
          e.preventDefault()
          // Deleting goes by id, which a broken file doesn't have, so it gets no menu
          if (broken()) return
          // The ContextMenu key / Shift+F10 report 0,0; anchor to the row instead
          const r = row.getBoundingClientRect()
          setMenu(
            e.clientX || e.clientY
              ? { x: e.clientX, y: e.clientY }
              : { x: r.left + 16, y: r.bottom }
          )
        }}
        // Notes can be dragged onto an open board
        draggable={isNote()}
        onDragStart={e =>
          e.dataTransfer?.setData(
            NOTE_MIME,
            JSON.stringify({ note: props.node.uuid, title: props.node.name })
          )
        }
      >
        <Show
          when={isFolder()}
          fallback={
            <Show
              when={!broken()}
              fallback={<TriangleAlert size={16} class="shrink-0 text-red-500" />}
            >
              <Show
                when={isBoard()}
                fallback={
                  <FileText size={16} class="shrink-0 text-gray-500 dark:text-zinc-400" />
                }
              >
                <LayoutDashboard size={16} class="shrink-0 text-blue-500" />
              </Show>
            </Show>
          }
        >
          <Show
            when={props.isOpen(props.node.path)}
            fallback={
              <Folder size={16} class="shrink-0 text-gray-500 dark:text-zinc-400" />
            }
          >
            <FolderOpen size={16} class="shrink-0 text-gray-500 dark:text-zinc-400" />
          </Show>
        </Show>
        <span class="flex-1 truncate">{props.node.name}</span>
      </div>
      <Show when={menu()}>
        {at => (
          <RowMenu
            at={at()}
            name={props.node.name}
            isFolder={isFolder()}
            onOpen={open}
            onDelete={() => props.onDelete(props.node)}
            onClose={refocus => {
              setMenu(undefined)
              if (refocus) row.focus({ preventScroll: true })
            }}
          />
        )}
      </Show>
      <Show when={isFolder() && props.isOpen(props.node.path)}>
        <For each={props.node.children}>
          {child => <Row {...props} node={child} depth={props.depth + 1} />}
        </For>
      </Show>
    </>
  )
}

// Right-click menu for a row; deleting asks again so a stray click can't destroy anything.
function RowMenu(props: {
  at: { x: number; y: number }
  name: string
  isFolder: boolean
  onOpen: () => void
  onDelete: () => void
  onClose: (refocus?: boolean) => void
}) {
  let panel!: HTMLDivElement
  const [confirm, setConfirm] = createSignal(false)
  const items = () => [...panel.querySelectorAll<HTMLElement>('[role="menuitem"]')]
  const focusItem = (i: number) =>
    items()
      .at(i % items().length)
      ?.focus({ preventScroll: true })

  function act(action: () => void): void {
    props.onClose()
    action()
  }

  onMount(() => {
    focusItem(0)
    const outside = (e: PointerEvent) =>
      !panel.contains(e.target as Node) && props.onClose()
    const scroll = () => props.onClose()
    // Capture: the sidebar and board stop some events before they bubble up
    window.addEventListener('pointerdown', outside, true)
    window.addEventListener('scroll', scroll, true)
    onCleanup(() => {
      window.removeEventListener('pointerdown', outside, true)
      window.removeEventListener('scroll', scroll, true)
    })
  })

  const item =
    'rounded px-3 py-1 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:hover:bg-zinc-700 dark:focus:bg-zinc-700'

  return (
    // Portal: the sidebar's overflow would clip the menu
    <Portal>
      <div
        ref={panel}
        role="menu"
        aria-label={props.name}
        class="fixed z-50 flex max-w-64 min-w-36 flex-col rounded-md border border-gray-200 bg-white p-1 text-sm text-gray-800 shadow-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        style={{
          left: `${props.at.x}px`,
          top: `${props.at.y}px`,
          // Shifts back by its own size (translate % is self-relative) when it would overflow the viewport
          transform: `translate(min(0px, calc(100vw - ${props.at.x}px - 100% - 4px)), min(0px, calc(100vh - ${props.at.y}px - 100% - 4px)))`
        }}
        // Solid bubbles events through the Portal to the row, which would open it or reopen this menu
        onClick={e => e.stopPropagation()}
        onContextMenu={e => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onKeyDown={e => {
          // Also keeps keys like Delete from reaching the board's window shortcuts
          e.stopPropagation()
          const i = items().indexOf(document.activeElement as HTMLElement)
          if (e.key === 'Escape') props.onClose(true)
          else if (e.key === 'ArrowDown') focusItem(i + 1)
          else if (e.key === 'ArrowUp') focusItem(i - 1)
          else return
          e.preventDefault()
        }}
      >
        <Show
          when={confirm()}
          fallback={
            <>
              <Show when={!props.isFolder}>
                <button role="menuitem" class={item} onClick={() => act(props.onOpen)}>
                  Open
                </button>
              </Show>
              <button
                role="menuitem"
                class={item}
                onClick={() => {
                  setConfirm(true)
                  focusItem(0)
                }}
              >
                Delete…
              </button>
            </>
          }
        >
          <p class="px-3 py-1 break-words">
            Delete {props.name}
            {props.isFolder && ' and everything in it'}?
          </p>
          <div class="flex justify-end gap-1">
            <button role="menuitem" class={item} onClick={() => props.onClose(true)}>
              Cancel
            </button>
            <button
              role="menuitem"
              class={`${item} text-red-600 dark:text-red-400`}
              onClick={() => act(props.onDelete)}
            >
              Delete
            </button>
          </div>
        </Show>
      </div>
    </Portal>
  )
}

export default function Tree(props: TreeProps) {
  return <For each={props.nodes}>{node => <Row {...props} node={node} depth={0} />}</For>
}
