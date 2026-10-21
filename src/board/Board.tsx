import { DocumentAPI } from '@api/document'
import {
  Background,
  BaseEdge,
  ConnectionMode,
  Controls,
  createEdgeStore,
  createNodeStore,
  EdgeLabel,
  getSmoothStepPath,
  Handle,
  MarkerType,
  MiniMap,
  SolidFlow,
  useSolidFlow,
  type EdgeProps,
  type NodeProps
} from '@dschz/solid-flow'
import '@dschz/solid-flow/styles'
import { useNavigate } from '@solidjs/router'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useToast } from '@ui/toast/ToastContext'
import { createContext, createResource, createSignal, For, onCleanup, Show, useContext, type JSX } from 'solid-js'
import { parseBoard, serializeBoard, type BoardFile, type EdgeData, type NoteData, type TextData } from './boardFile'
import './board.css'

// Drag payload from the library tree onto a board.
export const NOTE_MIME = 'application/x-whiteboard-note'

// Records a user change (undo history + save). Provided by Board to its cards and connectors.
const Commit = createContext<() => void>(() => {})

function Sides() {
  return (
    <For each={['top', 'right', 'bottom', 'left'] as const}>
      {side => <Handle type="source" position={side} id={side} />}
    </For>
  )
}

// Inline editor: shows `view` until double-clicked, then an input that saves on blur or Enter; Escape cancels.
function Editable(props: {
  value: string
  multiline?: boolean
  onSave: (value: string) => void
  children: JSX.Element
}) {
  const [editing, setEditing] = createSignal(false)
  const save = (value: string) => {
    setEditing(false)
    if (value !== props.value) props.onSave(value)
  }
  const field = {
    ref: (el: HTMLInputElement | HTMLTextAreaElement) => queueMicrotask(() => el.select()),
    value: props.value,
    class: 'nodrag nopan nowheel w-full resize-none border border-blue-400 bg-white text-sm outline-none',
    // Escape removes the input, which blurs it; editing() is already false by then, so nothing is saved.
    onBlur: (e: FocusEvent) => editing() && save((e.currentTarget as HTMLInputElement).value),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditing(false)
      else if (e.key === 'Enter' && !(props.multiline && e.shiftKey)) (e.currentTarget as HTMLElement).blur()
    }
  }
  return (
    <Show
      when={editing()}
      // Native listener: Solid's delegated events don't reach elements inside the flow's layers
      fallback={<div class="h-full w-full" on:dblclick={() => setEditing(true)}>{props.children}</div>}
    >
      {props.multiline ? <textarea rows={3} {...field} /> : <input {...field} />}
    </Show>
  )
}

// First lines of a note's body, without its front matter.
function preview(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim().split('\n').slice(0, 3).join('\n')
}

function NoteNode(props: NodeProps<NoteData, 'note'>) {
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
        <Show when={!body.error} fallback={<span class="text-red-600">Note not found</span>}>
          {preview(body() ?? '')}
        </Show>
      </div>
    </div>
  )
}

function TextNode(props: NodeProps<TextData, 'text'>) {
  const flow = useSolidFlow()
  const commit = useContext(Commit)
  return (
    <div class="min-h-[48px] w-[180px] rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm">
      <Sides />
      <Editable
        value={props.data.text}
        multiline
        onSave={text => {
          flow.updateNodeData(props.id, { text })
          commit()
        }}
      >
        <span class="whitespace-pre-wrap">{props.data.text || 'Double-click to edit'}</span>
      </Editable>
    </div>
  )
}

function LabeledEdge(props: EdgeProps<EdgeData, 'labeled'>) {
  const flow = useSolidFlow()
  const commit = useContext(Commit)
  const path = () => getSmoothStepPath(props)
  return (
    <>
      <BaseEdge path={path()[0]} markerEnd={props.markerEnd} style={{ stroke: '#64748b', 'stroke-width': '1.5px' }} />
      <EdgeLabel x={path()[1]} y={path()[2]}>
        <Editable
          value={props.data?.text ?? ''}
          onSave={text => {
            flow.updateEdge(props.id, e => ({ data: { ...e.data, text } }))
            commit()
          }}
        >
          {/* Empty labels stay double-clickable as a small dot */}
          <span class="inline-block min-h-2 min-w-2 rounded bg-white px-1 text-xs">{props.data?.text}</span>
        </Editable>
      </EdgeLabel>
    </>
  )
}

const nodeTypes = { note: NoteNode, text: TextNode }
const edgeTypes = { labeled: LabeledEdge }

export default function Board(props: { file: BoardFile; text: string; onReload: () => void }) {
  const flow = useSolidFlow()
  const { error } = useToast()
  const [nodes, setNodes] = createNodeStore<typeof nodeTypes>(props.file.nodes as never)
  const [edges, setEdges] = createEdgeStore<typeof edgeTypes>(props.file.edges as never)
  const uuid = props.file.uuid

  // The live canvas as file text. Saves use it rather than the last undo snapshot,
  // so a change that skipped commit() is still written.
  const serialize = () => serializeBoard(uuid, nodes, edges)

  // --- Saving: every user change goes through commit(), which saves 500ms after the last one ---
  // The exact text last read from or written to disk; anything else there was written by someone else.
  let disk = props.text
  const [conflict, setConflict] = createSignal(false)
  const write = async (overwrite = false) => {
    if (conflict() && !overwrite) return
    const text = serialize()
    try {
      // shortcut: read-compare-write has a tiny race (an outside write between the read and the save is lost);
      // move the compare into the backend (compare-and-swap in file_save) if boards get synced or shared live.
      if (!overwrite && (await DocumentAPI.file_read_by_uuid(uuid)) !== disk) {
        setConflict(true)
        error('Board not saved: the file was changed outside the app.')
        return
      }
      if (text !== disk) await DocumentAPI.file_save(uuid, text)
      disk = text
    } catch (err) {
      error(`Board not saved: ${String(err)}`)
    }
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  // Saves run one after another, so two never interleave their read and write.
  let saving = Promise.resolve()
  const save = (overwrite = false) => {
    clearTimeout(timer)
    timer = undefined
    return (saving = saving.then(() => write(overwrite)))
  }
  const flush = () => (timer ? save() : saving)
  // Leaving the board flushes a pending save instead of dropping it.
  onCleanup(() => void flush())
  // So does closing the window: with a JS listener, Tauri holds the close and the API destroys the window after it.
  const unlistenClose = getCurrentWindow().onCloseRequested(async e => {
    await flush()
    if (!conflict()) return
    e.preventDefault()
    error('This board changed on disk. Reload or overwrite it before closing.')
  })
  onCleanup(() => void unlistenClose.then(unlisten => unlisten()))
  // A reload tears the page down before a read could answer, so the pending save is sent unchecked.
  // shortcut: an outside edit in the last 500ms before a reload gets overwritten; upgrade with the backend compare-and-swap.
  const onPageHide = () => {
    if (!timer || conflict()) return
    clearTimeout(timer)
    timer = undefined
    void write(true)
  }
  window.addEventListener('pagehide', onPageHide)
  onCleanup(() => window.removeEventListener('pagehide', onPageHide))

  // --- Undo/redo over snapshots of the file text ---
  let current = serialize()
  const undoStack: string[] = []
  let redoStack: string[] = []
  const apply = (s: string) => {
    const file = parseBoard(s)
    setNodes(file.nodes as never)
    setEdges(file.edges as never)
    current = s
    clearTimeout(timer)
    timer = setTimeout(() => void save(), 500)
  }
  const commit = () => {
    const next = serialize()
    // Arrow-key releases commit even when nothing moved.
    if (next === current) return
    undoStack.push(current)
    redoStack = []
    current = next
    clearTimeout(timer)
    timer = setTimeout(() => void save(), 500)
  }
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (!e.ctrlKey || tag === 'INPUT' || tag === 'TEXTAREA') return
    const [from, to] = e.key === 'z' ? [undoStack, redoStack] : e.key === 'y' ? [redoStack, undoStack] : []
    const s = from?.pop()
    if (!s || !to) return
    e.preventDefault()
    to.push(current)
    apply(s)
  }
  // The flow moves selected cards on arrow keydown (moveSelectedNodes) with no drag-stop callback,
  // so record the move when the key is released; holding the key down gives one undo step.
  const onKeyUp = (e: KeyboardEvent) => e.key.startsWith('Arrow') && commit()
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKeyUp)
  onCleanup(() => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('keyup', onKeyUp)
  })

  // --- Adding cards ---
  const add = (type: 'note' | 'text', at: { x: number; y: number }, data: NoteData | TextData) => {
    setNodes(list => [...list, { id: crypto.randomUUID(), type, position: flow.screenToFlowPosition(at), data }] as never)
    commit()
  }
  const onDblClick = (e: MouseEvent) => {
    // Only a direct hit on the empty background. Checking "not inside a card" isn't enough:
    // a card's own double-click swaps its text for an input, detaching the event target first.
    if (!(e.target as Element).classList.contains('solid-flow__pane')) return
    add('text', { x: e.clientX, y: e.clientY }, { text: '' })
  }
  const onDrop = (e: DragEvent) => {
    const raw = e.dataTransfer?.getData(NOTE_MIME)
    if (!raw) return
    e.preventDefault()
    add('note', { x: e.clientX, y: e.clientY }, JSON.parse(raw) as NoteData)
  }

  return (
    <Commit.Provider value={commit}>
    <div
      class="relative h-full w-full"
      on:dblclick={onDblClick}
      onDragOver={e => e.dataTransfer?.types.includes(NOTE_MIME) && e.preventDefault()}
      onDrop={onDrop}
    >
      <SolidFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'labeled', data: { text: '' }, markerEnd: { type: MarkerType.ArrowClosed } }}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={24}
        snapGrid={[10, 10]}
        minZoom={0.1}
        maxZoom={4}
        selectionKey="Shift"
        deleteKey={['Delete', 'Backspace']}
        zoomOnDoubleClick={false}
        fitView
        // A board with one or two cards shouldn't open zoomed in until a card fills the screen
        fitViewOptions={{ maxZoom: 1 }}
        // MIT-licensed; the corner credit is optional
        proOptions={{ hideAttribution: true }}
        onNodeDragStop={commit}
        onConnect={commit}
        onDelete={commit}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={20} />
      </SolidFlow>
      <Show when={conflict()}>
        <div class="absolute top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm shadow">
          This board was changed outside the app, so your edits are not being saved.
          <button class="rounded border border-gray-300 bg-white px-2" onClick={() => props.onReload()}>
            Reload
          </button>
          <button
            class="rounded border border-gray-300 bg-white px-2"
            onClick={() => {
              setConflict(false)
              void save(true)
            }}
          >
            Overwrite
          </button>
        </div>
      </Show>
    </div>
    </Commit.Provider>
  )
}
