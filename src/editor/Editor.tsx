import { Token } from 'markdown-it'
import { createSignal, For, onCleanup, onMount } from 'solid-js'
import { PieceTable } from './PieceTable'
import type { Piece } from './types'

interface TableData {
  original: string
  add: string | null
  pieces: Piece[]
}

function DebugTree(props: { data: TableData; cursor: number; events: string[] }) {
  const getText = (p: Piece, maxLen = 20) => {
    const buf = p.buffer === 'Original' ? props.data.original : props.data.add
    const text = (buf?.substring(p.start, p.start + p.len) ?? '').replace(/\n/g, '↵')
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
  }

  return (
    <div class="bg-neutral-900 text-neutral-300 font-mono text-xs p-4 rounded-lg overflow-auto max-h-80">
      <div class="text-white">root</div>
      <div class="text-neutral-500 ml-2">├ cursor: {props.cursor}</div>
      <div class="text-neutral-500 ml-2 truncate">
        ├ original: "{props.data.original.slice(0, 30).replace(/\n/g, '↵')}
        {props.data.original.length > 30 ? '...' : ''}"
      </div>
      <div class="text-neutral-500 ml-2 truncate">
        ├ add: "{(props.data.add ?? '').slice(0, 30)}
        {(props.data.add?.length ?? 0) > 30 ? '...' : ''}"
      </div>
      <div class="ml-2">
        <span class="text-neutral-500">└ </span>
        <span class="text-purple-400">pieces</span>
        <span class="text-neutral-500"> ({props.data.pieces.length})</span>
      </div>
      <For each={props.data.pieces}>
        {(piece, i) => {
          const isLast = () => i() === props.data.pieces.length - 1
          const prefix = () => (isLast() ? '└' : '├')
          return (
            <div class="ml-6 whitespace-nowrap">
              <span class="text-neutral-500">{prefix()} </span>
              <span class="text-neutral-400">({i()}) </span>
              <span class="text-blue-400">{piece.buffer.toLowerCase()}</span>
              <span class="text-green-400"> "{getText(piece)}"</span>
              <span class="text-neutral-500">
                {' '}
                {`{ start: ${piece.start}, len: ${piece.len} }`}
              </span>
            </div>
          )
        }}
      </For>
      <div class="mt-3 border-t border-neutral-700 pt-2">
        <div class="text-neutral-500">events:</div>
        <For each={props.events.slice(0, 5)}>
          {event => <div class="ml-2 text-yellow-400">· {event}</div>}
        </For>
      </div>
    </div>
  )
}

function DocNode(props: { node: Node }) {
  return(<></>)

}

export default function Editor(props: { table: PieceTable }) {
  const [events, setEvents] = createSignal<string[]>([])
  const [cursor, setCursor] = createSignal<number>(0)
  const [tableData, setTableData] = createSignal<TableData>(props.table.getTable())

  const [content, setContent] = createSignal<Token[]>(props.table.getText())

  let editorRef: HTMLDivElement | undefined

  function updateCursor() {
    setEvents(prev => ['selectionchange', ...prev])
    const sel = document.getSelection()
    if (!sel || sel.rangeCount === 0) return

    const range = sel.getRangeAt(0)

    if (editorRef?.contains(range.startContainer)) {
      props.table.setCursor(range.endOffset)
      setCursor(range.endOffset)
    }
  }

  function handleInput(e: InputEvent) {
    e.preventDefault()
    setEvents(prev => [e.inputType, ...prev])
    props.table.handleStroke(e)
  }

  onMount(() => {
    document.addEventListener('selectionchange', updateCursor)
  })
  onCleanup(() => {
    document.removeEventListener('selectionchange', updateCursor)
  })

  return (
    <div
      ref={editorRef}
      contenteditable
      onBeforeInput={handleInput}
      class="flex flex-col gap-4"
    >
      {/*<DebugTree data={tableData()} cursor={cursor()} events={events()} />*/}
      <For each={content()}>{n => <DocNode node={n} />}</For>
    </div>
  )
}
