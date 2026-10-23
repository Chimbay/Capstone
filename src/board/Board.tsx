import {
  Background,
  ConnectionMode,
  ControlButton,
  Controls,
  createEdgeStore,
  createNodeStore,
  EdgeLabelRenderer,
  EdgeReconnectAnchor,
  MarkerType,
  MiniMap,
  SolidFlow,
  useConnection,
  useSolidFlow,
  useViewport,
  type EdgeProps,
  type OnConnectEnd,
  type OnConnectStart
} from '@dschz/solid-flow'
import '@dschz/solid-flow/styles'
import { useToast } from '@ui/toast/ToastContext'
import { SquareDashed } from 'lucide-solid'
import { createSignal, For, onCleanup, Show } from 'solid-js'
import { unwrap } from 'solid-js/store'
import { ringDelay } from '../settings'
import {
  CARD_SIZE,
  parseBoard,
  serializeBoard,
  type BoardFile,
  type EdgeData,
  type FrameData,
  type NoteData,
  type TextData
} from './boardFile'
import { copyCards, pasteCards } from './clipboard'
import { BoardContext } from './context'
import LabeledEdge from './edges/LabeledEdge'
import {
  absRect,
  alignTo,
  boundsOf,
  facingSide,
  frameAt,
  orientEdge,
  rectOf,
  ringSection,
  sidePoint,
  splitEdge,
  toRelative
} from './geometry'
import { createHistory } from './history'
import FrameNode from './nodes/FrameNode'
import NoteNode from './nodes/NoteNode'
import ShapeBox from './nodes/Shape'
import TextNode from './nodes/TextNode'
import { createSaver } from './saver'
import './board.css'

// Drag payload from the library tree onto a board.
export const NOTE_MIME = 'application/x-whiteboard-note'

const nodeTypes = { note: NoteNode, text: TextNode, frame: FrameNode }
// Draggable connector ends, so a connector can be moved onto another card (see onReconnect).
const ReconnectableEdge = (p: EdgeProps<EdgeData, 'labeled'>) => (
  <>
    <LabeledEdge {...p} />
    <EdgeReconnectAnchor type="source" position={{ x: p.sourceX, y: p.sourceY }} />
    <EdgeReconnectAnchor type="target" position={{ x: p.targetX, y: p.targetY }} />
  </>
)
const edgeTypes = { labeled: ReconnectableEdge }

// A ring section: the card it makes, and its button's glyph (CSS for a shape, `mark` text otherwise)
type RingItem = {
  shape: TextData['shape']
  label: string
  glyph?: string
  mark?: string
  text?: string
  size?: { width: number; height: number }
}
// The shape picker shown when a connector drag holds still: buttons clockwise from the top,
// 40px around the hold point (see ringButton), each with a CSS glyph of its shape.
const SHAPES: RingItem[] = [
  { shape: 'rect', label: 'Rectangle', glyph: 'h-3 w-4' },
  { shape: 'rounded', label: 'Rounded', glyph: 'h-3 w-4 rounded' },
  { shape: 'ellipse', label: 'Ellipse', glyph: 'h-3 w-4 rounded-[50%]' },
  { shape: 'diamond', label: 'Diamond', glyph: 'size-2.5 rotate-45' }
]
// Text mode's sections: borderless 'plain' title cards, sized to their level (see Markdown's blockClass)
const HEADINGS: RingItem[] = [
  [320, 80],
  [280, 64],
  [240, 56],
  [200, 48]
]
  .map(
    ([width, height], i): RingItem => ({
      shape: 'plain',
      label: `Heading ${i + 1}`,
      mark: `H${i + 1}`,
      text: `${'#'.repeat(i + 1)} Heading`,
      size: { width, height }
    })
  )
  // The ring counts clockwise; this order reads H1 at the top, then H2, H3, H4 counter-clockwise
  .map((_, i, all) => all[(all.length - i) % all.length])
// The toolbar above an empty-canvas ring switches the ring between these lists; Shapes when it opens
const MODES = [
  { label: 'Shapes', items: SHAPES },
  { label: 'Text', items: HEADINGS }
]
// Shared by the ring's disc and the toolbar: a soft translucent panel
const PANEL =
  'border border-gray-200/70 bg-white/60 shadow-lg backdrop-blur-sm dark:border-zinc-700/70 dark:bg-zinc-900/60'
// A hovered ring button or toolbar item
const HOT =
  'scale-110 border-blue-500 bg-blue-50 text-blue-600 ring-2 ring-blue-500/30 dark:border-indigo-400 dark:bg-indigo-900/60 dark:text-indigo-200 dark:ring-indigo-400/30'
// The active mode's accent fill, unlike HOT's hover tint
const ACTIVE =
  'border-blue-500 bg-blue-500 text-white shadow-sm dark:border-indigo-500 dark:bg-indigo-500'
// The ring picks by angle anywhere from RING_MIN to RING_MAX px off the hold point (items go clockwise from the top, as ringSection counts)
const RING_MIN = 20
const RING_MAX = 96
// The drawn wedges stop just past the buttons; the pick still reaches RING_MAX
const WEDGE_R = 60
// An SVG point r px off the centre at angle a, clockwise from the top
const polar = (r: number, a: number) => `${r * Math.sin(a)} ${-r * Math.cos(a)}`
// The empty space between two drawn wedges, in px
const WEDGE_GAP = 6
// Section i of n spans i ± half a section, as ringSection rounds. Each edge is pulled in by half
// the gap at both radii, so the gap is even along its length instead of a thin slice at the centre.
const wedge = (i: number, n: number) => {
  const span = (2 * Math.PI) / n
  const [a0, a1] = [(i - 0.5) * span, (i + 0.5) * span]
  const pad = (r: number) => WEDGE_GAP / 2 / r
  const [o, n0] = [pad(WEDGE_R), pad(RING_MIN)]
  return `M${polar(WEDGE_R, a0 + o)}A${WEDGE_R} ${WEDGE_R} 0 0 1 ${polar(WEDGE_R, a1 - o)}L${polar(RING_MIN, a1 - n0)}A${RING_MIN} ${RING_MIN} 0 0 0 ${polar(RING_MIN, a0 + n0)}Z`
}

// Button i of n sits in the middle of its section
const ringButton = (i: number, n: number) => {
  const a = (i * 2 * Math.PI) / n
  return { left: `${40 * Math.sin(a)}px`, top: `${-40 * Math.cos(a)}px` }
}

// Copied cards as board-file text. Module-level, so it outlives a board and pastes into another.
let clipboard = ''

export default function Board(props: {
  file: BoardFile
  text: string
  onReload: () => void
}) {
  const flow = useSolidFlow()
  const { error } = useToast()
  const [nodes, setNodes] = createNodeStore<typeof nodeTypes>(props.file.nodes as never)
  const [edges, setEdges] = createEdgeStore<typeof edgeTypes>(props.file.edges as never)

  // The live canvas as file text. Saves use it rather than the last undo snapshot,
  // so a change that skipped commit() is still written.
  const serialize = () => serializeBoard(props.file.uuid, nodes, edges)
  const saver = createSaver({ uuid: props.file.uuid, text: props.text, serialize, error })
  const history = createHistory(serialize(), snapshot => {
    const { file } = parseBoard(snapshot)
    setNodes(file.nodes as never)
    setEdges(file.edges as never)
    saver.schedule()
  })
  // Every user change goes through commit(): an undo step, then a save 500ms after the last one.
  // regroup() and orient() run first, so the snapshot holds the frames and sides undo should restore.
  const commit = () => {
    regroup()
    orient()
    if (history.record(serialize())) saver.schedule()
  }

  // Adds copied cards as the new selection, in one undo step. Returns them, so pasting again cascades.
  const paste = (text: string) => {
    const pasted = pasteCards(text)
    setNodes(n => !!n.selected, 'selected', false)
    setEdges(e => !!e.selected, 'selected', false)
    setNodes(list => [...list, ...pasted.nodes] as never)
    setEdges(list => [...list, ...pasted.edges] as never)
    commit()
    return serializeBoard('', pasted.nodes, pasted.edges)
  }

  // --- Sections: a card belongs to the frame its center is over, and moves with it ---
  // Run on every commit, so dropping, pasting, adding or arrow-moving a card all (un)group it.
  const regroup = () => {
    const isFrame = (n: { type?: string }) => n.type === 'frame'
    // The flow needs each frame before its cards
    if (nodes.some((n, i) => i > 0 && isFrame(n) && !isFrame(nodes[i - 1])))
      setNodes(list => [...list.filter(isFrame), ...list.filter(n => !isFrame(n))])
    const frames = nodes.filter(isFrame).map(f => ({ id: f.id, ...rectOf(f) }))
    for (const n of nodes) {
      if (isFrame(n)) continue
      const rect = absRect(n, nodes)
      const to = frameAt(rect, frames, n.parentId)
      if (to?.id !== n.parentId)
        setNodes(x => x.id === n.id, { parentId: to?.id, position: toRelative(rect, to) })
    }
  }
  // Wraps the selected cards in a new section, or adds an empty one mid-view
  const addFrame = () => {
    const picked = nodes.filter(n => n.selected && n.type !== 'frame')
    const box = wrapper.getBoundingClientRect()
    const mid = flow.screenToFlowPosition({
      x: box.left + box.width / 2,
      y: box.top + box.height / 2
    })
    const { width, height } = CARD_SIZE.frame
    const rect = picked.length
      ? boundsOf(
          picked.map(n => absRect(n, nodes)),
          60
        )
      : { x: mid.x - width / 2, y: mid.y - height / 2, width, height }
    const data: FrameData = { title: 'Section' }
    // Out of any frame they were in, so regroup() moves them into the new, smaller one
    for (const n of picked) {
      const { x, y } = absRect(n, nodes)
      setNodes(m => m.id === n.id, { parentId: undefined, position: { x, y } })
    }
    setNodes(n => !!n.selected, 'selected', false)
    setEdges(e => !!e.selected, 'selected', false)
    setNodes(
      list =>
        [
          {
            id: crypto.randomUUID(),
            type: 'frame',
            position: { x: rect.x, y: rect.y },
            width: rect.width,
            height: rect.height,
            data,
            selected: true
          },
          ...list
        ] as never
    )
    commit()
  }

  // --- Alignment guides: a dragged card snaps its edges and center to other cards' ---
  type Card = (typeof nodes)[number]
  const [guides, setGuides] = createSignal<ReturnType<typeof alignTo>['guides']>([])
  // Turns both ends of every connector to face the other card; self-loops keep theirs.
  const orient = () => {
    const byId = new Map(nodes.map(n => [n.id, n]))
    for (const e of edges) {
      const a = byId.get(e.source)
      const b = byId.get(e.target)
      if (!a || !b || a === b) continue
      const { sourceHandle, targetHandle } = orientEdge(
        absRect(a, nodes),
        absRect(b, nodes)
      )
      if (sourceHandle !== e.sourceHandle || targetHandle !== e.targetHandle)
        setEdges(x => x.id === e.id, { sourceHandle, targetHandle })
    }
  }
  // Snaps the lead card (the one under the pointer) and moves the rest of the dragged group with it.
  // The library recomputes positions from the pointer on each move, so this re-applies after every move.
  const align = (lead: Card | undefined, dragged: Card[]) => {
    if (!lead) return []
    const ids = new Set(dragged.map(n => n.id))
    // A dragged frame's cards move with it, so they aren't lines to snap to
    const others = nodes
      .filter(n => !ids.has(n.id) && !ids.has(n.parentId ?? ''))
      .map(n => absRect(n, nodes))
    // The 10-unit grid moves the card in steps, so when zoomed in a half step keeps every line reachable
    const threshold = Math.max(6 / flow.getZoom(), 5)
    const { dx, dy, guides } = alignTo(absRect(lead, nodes), others, threshold)
    if (dx || dy)
      setNodes(
        n => ids.has(n.id),
        'position',
        p => ({ x: p.x + dx, y: p.y + dy })
      )
    return guides
  }

  // --- Keyboard: undo/redo, copy/paste/duplicate, and arrow-key moves ---
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (!e.ctrlKey || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (e.key === 'c' && nodes.some(n => n.selected)) clipboard = copyCards(nodes, edges)
    else if (e.key === 'v' && clipboard) clipboard = paste(clipboard)
    else if (e.key === 'g') {
      e.preventDefault() // the browser's find-next
      addFrame()
    } else if (e.key === 'd') {
      e.preventDefault() // the browser's bookmark shortcut
      paste(copyCards(nodes, edges))
    } else if (e.key === 'z' ? history.undo() : e.key === 'y' && history.redo())
      e.preventDefault()
  }
  // The flow moves selected cards on arrow keydown (moveSelectedNodes) with no drag-stop callback,
  // so record the move when the key is released; holding the key down gives one undo step.
  const onKeyUp = (e: KeyboardEvent) => {
    if (!e.key.startsWith('Arrow')) return
    commit()
  }
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKeyUp)
  onCleanup(() => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('keyup', onKeyUp)
  })

  // --- Keyboard: WASD pans the view while held, 600 screen px/s, Shift doubles ---
  // e.code, so Shift's uppercase and non-QWERTY layouts map by physical key
  const panDir: Record<string, [number, number]> = {
    KeyW: [0, 1],
    KeyA: [1, 0],
    KeyS: [0, -1],
    KeyD: [-1, 0]
  }
  const held = new Set<string>()
  let fast = false
  let frame = 0
  let last = 0
  const panStep = (now: number) => {
    // rAF's timestamp is the frame start, which can precede the keydown's performance.now()
    const step = (Math.max(0, now - last) / 1000) * 600 * (fast ? 2 : 1)
    last = now
    const v = flow.getViewport()
    let { x, y } = v
    for (const code of held) {
      x += panDir[code][0] * step
      y += panDir[code][1] * step
    }
    void flow.setViewport({ ...v, x, y })
    frame = requestAnimationFrame(panStep)
  }
  const stopPan = () => {
    held.clear()
    cancelAnimationFrame(frame)
    frame = 0
  }
  const onPanKey = (e: KeyboardEvent) => {
    fast = e.shiftKey
    const el = e.target as HTMLElement
    if (!panDir[e.code] || e.ctrlKey || e.metaKey || e.altKey || el.isContentEditable)
      return
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
    held.add(e.code)
    if (frame) return
    last = performance.now()
    frame = requestAnimationFrame(panStep)
  }
  const onPanKeyUp = (e: KeyboardEvent) => {
    fast = e.shiftKey
    held.delete(e.code)
    if (!held.size) stopPan()
  }
  window.addEventListener('keydown', onPanKey)
  window.addEventListener('keyup', onPanKeyUp)
  // A key released outside the window never sends keyup
  window.addEventListener('blur', stopPan)
  onCleanup(() => {
    window.removeEventListener('keydown', onPanKey)
    window.removeEventListener('keyup', onPanKeyUp)
    window.removeEventListener('blur', stopPan)
    stopPan()
  })

  // --- Adding cards ---
  const add = (
    type: 'note' | 'text',
    at: { x: number; y: number },
    data: NoteData | TextData,
    size: { width: number; height: number } = CARD_SIZE[type]
  ) => {
    setNodes(
      list =>
        [
          ...list,
          {
            id: crypto.randomUUID(),
            type,
            position: flow.screenToFlowPosition(at),
            ...size,
            data
          }
        ] as never
    )
    commit()
  }
  const onDblClick = (e: MouseEvent) => {
    // Only a direct hit on the empty background. Checking "not inside a card" isn't enough:
    // a card's own double-click swaps its text for an input, detaching the event target first.
    if (!(e.target as Element).classList.contains('solid-flow__pane')) return
    add('text', { x: e.clientX, y: e.clientY }, { text: '' })
  }
  // A connector dropped on empty canvas makes a new card centered there, attached on its side facing the source.
  // Dragging a connector's end also ends here (before onReconnectEnd); that must not add a card.
  let wrapper!: HTMLDivElement
  let reconnecting = false
  // Holding a new connector still over empty canvas opens the shape ring at that point (client coords).
  // The flow owns the drag and has no move callback, so window listeners watch it until onConnectEnd.
  const [ring, setRing] = createSignal<{ x: number; y: number }>()
  // The open ring's preview card: the last hovered section's item
  const [ghost, setGhost] = createSignal(SHAPES[0])
  // The ring section under the pointer, as an items() index; tracked by hand since the held pointer gets no :hover
  const [section, setSection] = createSignal<number>()
  // The mode toolbar shows only on an empty-canvas ring. Hovering a mode switches to it, and it stays
  // switched after the pointer leaves, so the pointer can slide up to Text and back down to pick.
  const [modes, setModes] = createSignal(false)
  const [mode, setMode] = createSignal(0)
  const items = () => MODES[mode()].items
  // A new connector's ghost follows the pointer until the ring opens and freezes it at the hold point
  const [pointer, setPointer] = createSignal<{ x: number; y: number }>()
  const ghostAt = () => ring() ?? pointer()
  const connection = useConnection()
  const viewport = useViewport()
  // While the drag is snapped to a handle, `to` is that handle's point relative to the flow container
  const snapTo = () => {
    const c = connection()
    return c.inProgress && c.isValid && c.toHandle ? c.to : undefined
  }
  // A new connector's source card, and the other card under the pointer, which a release connects to
  let source = ''
  const [hovered, setHovered] = createSignal<Card>()
  const cardAt = (x: number, y: number) => {
    const id = document.elementFromPoint(x, y)?.closest<HTMLElement>('.solid-flow__node')
      ?.dataset.id
    // A section's title is a node too, but it has no handles to connect to
    return source && id !== source
      ? nodes.find(n => n.id === id && n.type !== 'frame')
      : undefined
  }
  // The hovered card's side facing the source, in flow units
  const hoveredPoint = () => {
    const to = hovered()
    const from = nodes.find(n => n.id === source)
    if (!to || !from) return
    return sidePoint(
      absRect(to, nodes),
      facingSide(absRect(from, nodes), absRect(to, nodes))
    )
  }
  let cancelled = false
  let timer = 0
  let stopWatching = () => {}
  // The open ring's section at client (x, y), and whether it's within RING_MAX (there the ring beats a card)
  const ringAt = (x: number, y: number) => {
    const r = ring()
    if (!r) return
    const [dx, dy] = [x - r.x, y - r.y]
    // The toolbar, gaps included, hides the top wedge behind it (it sits within RING_MAX)
    const under = document.elementFromPoint(x, y)
    const hit = under?.closest('[data-modes]')
    const item = under?.closest<HTMLElement>('[data-mode]')
    const m = item ? Number(item.dataset.mode) : undefined
    const i = hit ? null : ringSection(dx, dy, items().length, RING_MIN, RING_MAX)
    return { near: Math.hypot(dx, dy) <= RING_MAX, i: i ?? undefined, m }
  }
  // Watches a held pointer until stopWatching(): `onMove` while the ring is closed, ghost hover once
  // it is open. Escape cancels. Shared by the connector-drag and connector-label holds.
  const watch = (onMove: (e: PointerEvent) => void, onUp?: (e: PointerEvent) => void) => {
    stopWatching()
    cancelled = false
    setGhost(SHAPES[0])
    setMode(0)
    // Anything still under the held pointer may show its own cursor (or 🚫), so force the default
    wrapper.classList.add('board-holding')
    // A connector drag starts after the press, so a text selection may already be under way
    window.getSelection()?.removeAllRanges()
    const move = (e: PointerEvent) => {
      const pick = ringAt(e.clientX, e.clientY)
      setHovered(pick?.near ? undefined : cardAt(e.clientX, e.clientY))
      if (!pick) return onMove(e)
      if (pick.m !== undefined) setMode(pick.m)
      setSection(pick.i)
      if (pick.i !== undefined) setGhost(items()[pick.i])
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      cancelled = true
      stopWatching()
    }
    const up = (e: PointerEvent) => onUp?.(e)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', stopWatching)
    window.addEventListener('keydown', onEscape)
    stopWatching = () => {
      clearTimeout(timer)
      setRing(undefined)
      setSection(undefined)
      setModes(false)
      wrapper.classList.remove('board-holding')
      setPointer(undefined)
      setHovered(undefined)
      source = ''
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', stopWatching)
      window.removeEventListener('keydown', onEscape)
    }
  }
  // The ghost waits for the first move: the start event carries the pre-threshold press point
  const onConnectStart: OnConnectStart = (_, { nodeId }) => {
    if (reconnecting) return
    let held = { x: -99, y: -99 }
    watch(e => {
      setPointer({ x: e.clientX, y: e.clientY })
      const delay = ringDelay()
      if (!delay || Math.hypot(e.clientX - held.x, e.clientY - held.y) < 6) return
      held = { x: e.clientX, y: e.clientY }
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        const under = document.elementFromPoint(held.x, held.y)
        if (under?.classList.contains('solid-flow__pane')) setRing(held)
      }, delay)
    })
    source = nodeId ?? ''
  }
  onCleanup(() => stopWatching())
  // A press held still opens the ring there; releasing with it open calls `onPick` with the hold
  // point and the picked section's item. Releasing elsewhere (the centre, past the ring, or the
  // mode toolbar) picks nothing. Moving 6px first cancels the hold.
  const hold = (
    down: PointerEvent,
    onPick: (at: { x: number; y: number }, item: RingItem) => void,
    onOpen?: () => void
  ) => {
    const delay = ringDelay()
    if (!delay || down.button !== 0 || (down.target as Element).closest('input')) return
    const at = { x: down.clientX, y: down.clientY }
    watch(
      e => Math.hypot(e.clientX - at.x, e.clientY - at.y) >= 6 && stopWatching(),
      e => {
        const pick = ringAt(e.clientX, e.clientY)
        const open = ring()
        stopWatching()
        if (open && pick?.i !== undefined) onPick(open, items()[pick.i])
      }
    )
    timer = window.setTimeout(() => {
      setRing(at)
      onOpen?.()
    }, delay)
  }
  // Holding a connector's label splits the connector A→B into A→card→B
  const holdEdge = (edgeId: string, down: PointerEvent) => {
    // No text selection may start, or the hold drags it natively (🚫); an open label input keeps its caret
    if (!(down.target as Element).closest('input')) down.preventDefault()
    hold(down, (at, item) => insertCard(edgeId, at, item.shape))
  }
  // Holding empty canvas adds a standalone card centered on the hold point. Shift is box-select.
  const onPaneDown = (down: PointerEvent) => {
    if (down.shiftKey || !(down.target as Element).classList.contains('solid-flow__pane'))
      return
    hold(
      down,
      (at, { shape, text = '', size = CARD_SIZE.text }) => {
        const z = flow.getZoom()
        const { width: w, height: h } = size
        add(
          'text',
          { x: at.x - (w * z) / 2, y: at.y - (h * z) / 2 },
          { text, shape },
          size
        )
      },
      () => {
        setModes(true)
        // shortcut: synthetic mouseup ends d3-zoom's pan; doesn't stop touch pans, upgrade if solid-flow adds a cancel-pan API
        window.dispatchEvent(new MouseEvent('mouseup', { view: window }))
      }
    )
  }
  const insertCard = (
    edgeId: string,
    at: { x: number; y: number },
    shape: TextData['shape']
  ) => {
    const edge = edges.find(e => e.id === edgeId)
    const rect = (id: string) => {
      const n = nodes.find(n => n.id === id)
      return n && { ...absRect(n, nodes), width: n.width ?? 0, height: n.height ?? 0 }
    }
    const a = edge && rect(edge.source)
    const b = edge && rect(edge.target)
    if (!edge || !a || !b) return
    const { width: w, height: h } = CARD_SIZE.text
    const { x, y } = flow.screenToFlowPosition(at)
    const card = {
      id: crypto.randomUUID(),
      x: x - w / 2,
      y: y - h / 2,
      width: w,
      height: h
    }
    const split = splitEdge(
      unwrap(edge) as BoardFile['edges'][number],
      a,
      b,
      card,
      crypto.randomUUID()
    )
    const data: TextData = { text: '', shape }
    setNodes(
      list =>
        [
          ...list,
          {
            id: card.id,
            type: 'text',
            position: { x: card.x, y: card.y },
            width: w,
            height: h,
            data
          }
        ] as never
    )
    setEdges(list => [...list.filter(e => e.id !== edgeId), ...split] as never)
    commit()
  }
  const onConnectEnd: OnConnectEnd = (e, c) => {
    const { clientX, clientY } = 'changedTouches' in e ? e.changedTouches[0] : e
    // The ring buttons get no click while the flow owns the drag, so pick by the release point's angle
    const pick = ringAt(clientX, clientY)
    const at = ring()
    // Within the ring's reach the ring wins over a card under it, as the highlight showed
    const target = pick?.near ? undefined : hovered()
    stopWatching()
    // Near a handle the flow has already made a normal connection
    if (reconnecting || cancelled || !c.fromNode || c.toHandle) return
    if (target) {
      const from = c.fromNode.id
      // Matches the flow's addEdge, which skips a connection that already exists (same ends after orient())
      if (edges.some(x => x.source === from && x.target === target.id)) return
      const fromCard = nodes.find(n => n.id === from)
      if (!fromCard) return
      setEdges(
        list =>
          [
            ...list,
            {
              id: crypto.randomUUID(),
              source: from,
              target: target.id,
              ...orientEdge(absRect(fromCard, nodes), absRect(target, nodes)),
              type: 'labeled',
              data: { text: '' },
              markerEnd: { type: MarkerType.ArrowClosed }
            }
          ] as never
      )
      return commit()
    }
    // With the ring open a section must be picked; the centre or past the ring drops the connector
    if (at && pick?.i === undefined) return
    if (!(at || (e.target as Element).classList.contains('solid-flow__pane'))) return
    const id = crypto.randomUUID()
    const { width: w, height: h } = CARD_SIZE.text
    // With the ring open the card takes the picked shape, where the ring opened
    const { x, y } = flow.screenToFlowPosition(at ?? { x: clientX, y: clientY })
    const data: TextData = { text: '' }
    // Connector rings never show the mode toolbar, so this is a shape
    if (pick?.i !== undefined) data.shape = items()[pick.i].shape
    const position = { x: x - w / 2, y: y - h / 2 }
    const { fromNode: from } = c
    const side = facingSide(
      {
        ...from.internals.positionAbsolute,
        width: from.width ?? 0,
        height: from.height ?? 0
      },
      { ...position, width: w, height: h }
    )
    setNodes(
      list =>
        [...list, { id, type: 'text', position, width: w, height: h, data }] as never
    )
    setEdges(
      list =>
        [
          ...list,
          {
            id: crypto.randomUUID(),
            source: c.fromNode.id,
            sourceHandle: c.fromHandle.id,
            target: id,
            targetHandle: side,
            type: 'labeled',
            data: { text: '' },
            markerEnd: { type: MarkerType.ArrowClosed }
          }
        ] as never
    )
    commit()
  }
  const onDrop = (e: DragEvent) => {
    const raw = e.dataTransfer?.getData(NOTE_MIME)
    if (!raw) return
    e.preventDefault()
    add('note', { x: e.clientX, y: e.clientY }, JSON.parse(raw) as NoteData)
  }

  return (
    <BoardContext.Provider value={{ commit, holdEdge }}>
      <div
        ref={wrapper}
        class="relative h-full w-full overflow-hidden"
        on:dblclick={onDblClick}
        on:pointerdown={onPaneDown}
        // Nothing in the board is dragged natively (notes only drop in), and a stray text/SVG drag shows 🚫
        on:dragstart={e => e.preventDefault()}
        onDragOver={e => e.dataTransfer?.types.includes(NOTE_MIME) && e.preventDefault()}
        onDrop={onDrop}
      >
        <SolidFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{
            type: 'labeled',
            data: { text: '' },
            markerEnd: { type: MarkerType.ArrowClosed }
          }}
          connectionMode={ConnectionMode.Loose}
          connectionRadius={24}
          snapGrid={[10, 10]}
          minZoom={0.1}
          maxZoom={4}
          selectionKey="Shift"
          deleteKey={['Delete', 'Backspace']}
          zoomOnDoubleClick={false}
          colorMode="system"
          // Only fit a board that has cards: on an empty board the fit waits for the first card,
          // then jumps the view so that card lands far from where it was placed.
          fitView={props.file.nodes.length > 0}
          // A board with one or two cards shouldn't open zoomed in until a card fills the screen
          fitViewOptions={{ maxZoom: 1 }}
          // MIT-licensed; the corner credit is optional
          proOptions={{ hideAttribution: true }}
          onNodeDrag={d => {
            setGuides(align(d.targetNode ?? d.nodes[0], d.nodes))
            orient()
          }}
          onNodeDragStop={d => {
            // Drag end writes back the library's grid-snapped positions, so snap again before saving
            if (guides().length) align(d.targetNode ?? d.nodes[0], d.nodes)
            setGuides([])
            commit()
          }}
          onConnect={commit}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          // The library has already moved the connector's end in the store
          onReconnect={commit}
          onReconnectStart={() => (reconnecting = true)}
          onReconnectEnd={() => (reconnecting = false)}
          onDelete={commit}
        >
          <Controls>
            <ControlButton
              title="Add section (Ctrl+G)"
              aria-label="Add section"
              onClick={addFrame}
            >
              <SquareDashed />
            </ControlButton>
          </Controls>
          <MiniMap />
          <Background variant="dots" gap={20} />
        </SolidFlow>
        <For each={guides()}>
          {g => {
            const { x, y, zoom } = flow.getViewport()
            return (
              <div
                class="pointer-events-none absolute z-10 bg-blue-500 dark:bg-indigo-400"
                style={{
                  left: `${g.x1 * zoom + x}px`,
                  top: `${g.y1 * zoom + y}px`,
                  width: `${Math.max((g.x2 - g.x1) * zoom, 1)}px`,
                  height: `${Math.max((g.y2 - g.y1) * zoom, 1)}px`
                }}
              />
            )
          }}
        </For>
        <Show when={ghostAt()}>
          {at => {
            // A heading's ghost takes its card's size, so Heading 1 previews wide
            const size = () => ghost().size ?? CARD_SIZE.text
            // In flow units inside the zoomed viewport, before the cards, so zoom/pan track and cards cover it
            const p = () => flow.screenToFlowPosition(at(), { snapToGrid: false })
            // Snapped to a handle or over a card: shrink into its handle and fade, so the drop reads as a connection, not a card
            const suck = () => {
              const s = snapTo()
              const { x, y, zoom } = viewport()
              const to = s ? { x: (s.x - x) / zoom, y: (s.y - y) / zoom } : hoveredPoint()
              if (!to) return
              return {
                opacity: '0',
                transform: `translate(${to.x - p().x}px, ${to.y - p().y}px) scale(0)`
              }
            }
            return (
              <EdgeLabelRenderer>
                <div
                  class="pointer-events-none absolute opacity-50 transition-[transform,opacity] duration-200 motion-reduce:transition-none"
                  style={{
                    left: `${p().x - size().width / 2}px`,
                    top: `${p().y - size().height / 2}px`,
                    width: `${size().width}px`,
                    height: `${size().height}px`,
                    ...suck()
                  }}
                >
                  <ShapeBox shape={ghost().shape} class="h-full w-full" />
                </div>
              </EdgeLabelRenderer>
            )
          }}
        </Show>
        <Show when={ring()}>
          {at => {
            const box = wrapper.getBoundingClientRect()
            // pointer-events only on the buttons, so the rest of the ring doesn't hide the canvas
            return (
              <div
                class="pointer-events-none absolute z-10 font-mono transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none starting:scale-90 starting:opacity-0"
                style={{ left: `${at().x - box.left}px`, top: `${at().y - box.top}px` }}
              >
                {/* Separate wedges with empty space between them, each its own translucent panel */}
                {/* Sized and centred (not a 0×0 overflow box) so the drop shadow has an area to paint in */}
                <svg
                  class="absolute -translate-1/2 overflow-visible drop-shadow-lg"
                  width={2 * WEDGE_R + 8}
                  height={2 * WEDGE_R + 8}
                  viewBox={`${-WEDGE_R - 4} ${-WEDGE_R - 4} ${2 * WEDGE_R + 8} ${2 * WEDGE_R + 8}`}
                  aria-hidden="true"
                >
                  <For each={items()}>
                    {(_, i) => (
                      <path
                        d={wedge(i(), items().length)}
                        stroke-linejoin="round"
                        class={`transition-[fill,stroke] duration-150 ease-out motion-reduce:transition-none ${section() === i() ? 'fill-blue-500/35 stroke-blue-500 stroke-2 dark:fill-indigo-500/45 dark:stroke-indigo-300' : 'fill-white/85 stroke-blue-500/80 stroke-[1.5] dark:fill-zinc-900/85 dark:stroke-indigo-400/80'}`}
                      />
                    )}
                  </For>
                </svg>
                <For each={items()}>
                  {(b, i) => (
                    <button
                      data-shape={b.shape}
                      aria-label={b.label}
                      title={b.label}
                      class={`pointer-events-auto absolute flex size-7 -translate-1/2 items-center justify-center rounded-full border shadow-sm transition-[scale,background-color,border-color,color] duration-150 ease-out motion-reduce:transition-none ${section() === i() ? HOT : 'border-gray-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'}`}
                      style={ringButton(i(), items().length)}
                    >
                      <Show
                        when={b.mark}
                        fallback={
                          <span class={`border-[1.5px] border-current ${b.glyph}`} />
                        }
                      >
                        <span class="text-[11px] font-bold">{b.mark}</span>
                      </Show>
                    </button>
                  )}
                </For>
                {/* The mode switcher, just above the top wedge; hovering a mode switches to it (see watch) */}
                <Show when={modes()}>
                  <div
                    data-modes
                    class={`pointer-events-auto absolute bottom-[68px] left-0 flex -translate-x-1/2 gap-1 rounded-full p-1 ${PANEL}`}
                  >
                    <For each={MODES}>
                      {(b, i) => (
                        <button
                          data-mode={i()}
                          aria-pressed={mode() === i()}
                          class={`pointer-events-auto flex h-7 items-center rounded-full border px-2.5 text-xs transition-[background-color,border-color,color] duration-150 ease-out motion-reduce:transition-none ${mode() === i() ? ACTIVE : 'border-transparent text-zinc-700 dark:text-zinc-200'}`}
                        >
                          {b.label}
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
                {/* The hovered section's name just below the wheel, clear of the slices and buttons */}
                <Show when={items()[section() ?? -1]}>
                  {b => (
                    <span class="absolute top-[68px] -translate-x-1/2 rounded-md border border-gray-200/70 bg-white/90 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-blue-600 shadow-sm backdrop-blur-sm dark:border-zinc-700/70 dark:bg-zinc-900/90 dark:text-indigo-300">
                      {b().label}
                    </span>
                  )}
                </Show>
              </div>
            )
          }}
        </Show>
        <Show when={saver.conflict()}>
          <div class="absolute top-2 left-1/2 z-10 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm shadow dark:border-amber-700 dark:bg-amber-950 dark:text-zinc-100">
            This board was changed outside the app, so your edits are not being saved.
            <button
              class="rounded border border-gray-300 bg-white px-2 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              onClick={() => props.onReload()}
            >
              Reload
            </button>
            <button
              class="rounded border border-gray-300 bg-white px-2 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              onClick={() => saver.overwrite()}
            >
              Overwrite
            </button>
          </div>
        </Show>
      </div>
    </BoardContext.Provider>
  )
}
