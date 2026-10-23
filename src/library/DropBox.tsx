import { createSignal, JSX, Show } from 'solid-js'

export default function DropBox(props: {
  onDrop: (files: FileList) => void
  children: JSX.Element
}) {
  const [dragging, setDragging] = createSignal(false)
  let dragCounter = 0

  function handleDrop(e: DragEvent): void {
    e.preventDefault()
    dragCounter = 0
    setDragging(false)
    if (e.dataTransfer?.files.length) {
      props.onDrop(e.dataTransfer.files)
    }
  }

  return (
    <div
      class="relative"
      onDragEnter={e => {
        // Only files from outside the app; notes dragged toward a board aren't uploads
        if (!e.dataTransfer?.types.includes('Files')) return
        dragCounter++
        setDragging(true)
      }}
      onDragLeave={e => {
        if (!e.dataTransfer?.types.includes('Files')) return
        dragCounter--
        if (dragCounter === 0) setDragging(false)
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Show when={dragging()}>
        <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded border-2 border-dashed border-blue-500 bg-blue-50/80 dark:border-indigo-400 dark:bg-indigo-950/50">
          Drop files here
        </div>
      </Show>
      {props.children}
    </div>
  )
}
