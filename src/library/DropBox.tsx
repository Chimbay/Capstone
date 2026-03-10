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
      onDragEnter={() => {
        dragCounter++
        setDragging(true)
      }}
      onDragLeave={() => {
        dragCounter--
        if (dragCounter === 0) setDragging(false)
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Show when={dragging()}>
        <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded border-2 border-dashed border-blue-500 bg-blue-50/80">
          Drop files here
        </div>
      </Show>
      {props.children}
    </div>
  )
}
