import { DocumentAPI } from '@api/document'
import { createSignal, JSX, Show } from 'solid-js'

export default function DropBox(props: { children: JSX.Element }) {
  const [dragging, setDragging] = createSignal(false)

  function handleDrop(e: DragEvent): void {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer?.files.length) {
      void DocumentAPI.file_upload(e.dataTransfer.files)
    }
  }

  return (
    <div
      class="relative"
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <Show when={dragging()}>
        <div class="absolute inset-0 flex items-center justify-center bg-blue-50/80 border-2 border-dashed border-blue-500 rounded z-10">
          Drop files here
        </div>
      </Show>
      {props.children}
    </div>
  )
}
