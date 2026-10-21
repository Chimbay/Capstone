import { DocumentAPI } from '@api/document'
import Board, { type BoardFile } from '@board/Board'
import { SolidFlowProvider } from '@dschz/solid-flow'
import Library from '@library/Library'
import { useParams } from '@solidjs/router'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, Show } from 'solid-js'

// Board files are user-editable on disk, so check the shape before handing them to the canvas.
function parseBoard(text: string): BoardFile {
  const file = JSON.parse(text) as Partial<BoardFile>
  if (typeof file.uuid !== 'string' || !Array.isArray(file.nodes) || !Array.isArray(file.edges))
    throw new Error('not a board file')
  return file as BoardFile
}

export default function BoardView() {
  const params = useParams<{ uuid: string }>()
  const { error } = useToast()
  const [file] = createResource(
    () => params.uuid,
    async uuid => {
      try {
        return parseBoard(await DocumentAPI.file_read_by_uuid(uuid))
      } catch (err) {
        error(`Could not open board: ${String(err)}`)
        throw err
      }
    }
  )

  return (
    <div class="flex h-dvh">
      <aside class="w-64 shrink-0 overflow-y-auto border-r border-gray-200 p-2">
        <Library />
      </aside>
      <div class="flex-1">
        {/* keyed: switching boards remounts the canvas, which flushes the old board's pending save */}
        <Show when={file()} keyed fallback={<>Loading...</>}>
          {f => (
            <SolidFlowProvider>
              <Board file={f} />
            </SolidFlowProvider>
          )}
        </Show>
      </div>
    </div>
  )
}
