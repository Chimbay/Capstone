import {
  Background,
  ConnectionMode,
  Controls,
  createEdgeStore,
  createNodeStore,
  MarkerType,
  MiniMap,
  SolidFlow,
  useSolidFlow
} from '@dschz/solid-flow'
import '@dschz/solid-flow/styles'
import { useToast } from '@ui/toast/ToastContext'
import { onCleanup, Show } from 'solid-js'
import { parseBoard, serializeBoard, type BoardFile, type NoteData, type TextData } from './boardFile'
import { BoardContext } from './context'
import LabeledEdge from './edges/LabeledEdge'
import { createHistory } from './history'
import NoteNode from './nodes/NoteNode'
import TextNode from './nodes/TextNode'
import { createSaver } from './saver'
import './board.css'

// Drag payload from the library tree onto a board.
export const NOTE_MIME = 'application/x-whiteboard-note'

const nodeTypes = { note: NoteNode, text: TextNode }
const edgeTypes = { labeled: LabeledEdge }

export default function Board(props: { file: BoardFile; text: string; onReload: () => void }) {
  const flow = useSolidFlow()
  const { error } = useToast()
  const [nodes, setNodes] = createNodeStore<typeof nodeTypes>(props.file.nodes as never)
  const [edges, setEdges] = createEdgeStore<typeof edgeTypes>(props.file.edges as never)

  // The live canvas as file text. Saves use it rather than the last undo snapshot,
  // so a change that skipped commit() is still written.
  const serialize = () => serializeBoard(props.file.uuid, nodes, edges)
  const saver = createSaver({ uuid: props.file.uuid, text: props.text, serialize, error })
  const history = createHistory(serialize(), snapshot => {
    const file = parseBoard(snapshot)
    setNodes(file.nodes as never)
    setEdges(file.edges as never)
    saver.schedule()
  })
  // Every user change goes through commit(): an undo step, then a save 500ms after the last one.
  const commit = () => history.record(serialize()) && saver.schedule()

  // --- Keyboard: undo/redo, and arrow-key moves ---
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (!e.ctrlKey || tag === 'INPUT' || tag === 'TEXTAREA') return
    const done = e.key === 'z' ? history.undo() : e.key === 'y' ? history.redo() : false
    if (done) e.preventDefault()
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
    <BoardContext.Provider value={{ commit }}>
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
        <Show when={saver.conflict()}>
          <div class="absolute top-2 left-1/2 z-10 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm shadow">
            This board was changed outside the app, so your edits are not being saved.
            <button class="rounded border border-gray-300 bg-white px-2" onClick={() => props.onReload()}>
              Reload
            </button>
            <button class="rounded border border-gray-300 bg-white px-2" onClick={() => saver.overwrite()}>
              Overwrite
            </button>
          </div>
        </Show>
      </div>
    </BoardContext.Provider>
  )
}
