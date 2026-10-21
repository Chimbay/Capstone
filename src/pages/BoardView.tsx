import { DocumentAPI } from '@api/document'
import Board from '@board/Board'
import { parseBoard } from '@board/boardFile'
import { SolidFlowProvider } from '@dschz/solid-flow'
import Library from '@library/Library'
import { useParams } from '@solidjs/router'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, Show } from 'solid-js'

export default function BoardView() {
  const params = useParams<{ uuid: string }>()
  const { error } = useToast()
  const [file, { refetch }] = createResource(
    () => params.uuid,
    async uuid => {
      try {
        // The raw text rides along so the board can tell if the file changes on disk behind its back.
        const text = await DocumentAPI.file_read_by_uuid(uuid)
        return { file: parseBoard(text), text }
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
              <Board file={f.file} text={f.text} onReload={() => void refetch()} />
            </SolidFlowProvider>
          )}
        </Show>
      </div>
    </div>
  )
}
