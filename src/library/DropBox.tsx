import { DocumentAPI } from '@api/document'
import { createSignal, JSX, Show } from 'solid-js'

export default function DropBox(props: { children: JSX.Element }) {
  const [dragging, setDragging] = createSignal(false)
  let dragCounter = 0

  function handleDrop(e: DragEvent): void {
    e.preventDefault()
    dragCounter = 0
    setDragging(false)
    if (e.dataTransfer?.files.length) {
      void DocumentAPI.file_upload(e.dataTransfer.files)
    }
  }

  return (
    <div
      class="relative"
      onDragEnter={() => { dragCounter++; setDragging(true) }}
      onDragLeave={() => { dragCounter--; if (dragCounter === 0) setDragging(false) }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Show when={dragging()}>
        <div class="absolute inset-0 flex items-center justify-center bg-blue-50/80 border-2 border-dashed border-blue-500 rounded z-10 pointer-events-none">
          Drop files here
        </div>
      </Show>
      {props.children}
    </div>
  )
}
