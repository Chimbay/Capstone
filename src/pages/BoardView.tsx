import { DocumentAPI } from '@api/document'
import Board from '@board/Board'
import { parseBoard } from '@board/boardFile'
import { SolidFlowProvider } from '@dschz/solid-flow'
import Library from '@library/Library'
import { useParams } from '@solidjs/router'
import ErrorPanel from '@ui/ErrorPanel'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, Match, Switch } from 'solid-js'

export default function BoardView() {
  const params = useParams<{ uuid: string }>()
  const { error } = useToast()
  const [file, { refetch }] = createResource(
    () => params.uuid,
    async uuid => {
      // The raw text rides along so the board can tell if the file changes on disk behind its back.
      const text = await DocumentAPI.file_read_by_uuid(uuid)
      const { file, repaired } = parseBoard(text)
      if (repaired)
        error(
          `Repaired ${repaired} broken item${repaired === 1 ? '' : 's'} in this board; the next change saves the fix.`
        )
      return { file, text }
    }
  )

  return (
    <div class="flex h-dvh">
      <aside class="w-64 shrink-0 overflow-y-auto border-r border-gray-200 p-2 dark:border-zinc-700">
        <Library />
      </aside>
      <div class="flex-1">
        <Switch fallback={<>Loading...</>}>
          {/* Checked first: reading an errored resource throws */}
          <Match when={file.error as unknown}>
            <ErrorPanel
              title="Could not open this board"
              message={String(file.error)}
              onRetry={() => void refetch()}
            />
          </Match>
          {/* keyed: switching boards remounts the canvas, which flushes the old board's pending save */}
          <Match when={file()} keyed>
            {f => (
              <SolidFlowProvider>
                <Board file={f.file} text={f.text} onReload={() => void refetch()} />
              </SolidFlowProvider>
            )}
          </Match>
        </Switch>
      </div>
    </div>
  )
}
