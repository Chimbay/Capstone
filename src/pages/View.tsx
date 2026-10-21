import { DocumentAPI } from '@api/document'
import Editor from '@editor/Editor'
import { splitNote } from '@editor/note_file'
import { RenderDocument } from '@editor/render'
import { serialize } from '@editor/serialize'
import { useBeforeLeave, useParams } from '@solidjs/router'
import { listen } from '@tauri-apps/api/event'
import { useToast } from '@ui/toast/ToastContext'
import ErrorPanel from '@ui/ErrorPanel'
import { createResource, Match, onCleanup, Switch } from 'solid-js'

function Processor(props: { text: string; uuid: string }) {
  // The front-matter id is kept out of the editor so it can't be deleted, and re-attached on save
  const { head, body, eol } = splitNote(props.text)
  const document = new RenderDocument(body)
  const { success, error } = useToast()

  let dirty = false
  document.onChange = () => (dirty = true)

  async function save(): Promise<void> {
    const content = head + serialize(document.getDocumentBlocks(), eol)
    // Cleared before the await so edits made while saving mark it dirty again
    dirty = false
    try {
      await DocumentAPI.file_save(props.uuid, content)
      success('Saved')
    } catch (err: unknown) {
      dirty = true
      error(`Save failed: ${err as string}`) // Rust errors serialize to plain strings
    }
  }

  const unlisten = listen('menu:save', () => void save())
  // Registered synchronously: onCleanup inside .then() runs outside the component and never fires
  onCleanup(() => void unlisten.then(off => off()))

  const onKeyDown = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault()
      void save()
    }
  }
  window.addEventListener('keydown', onKeyDown)
  onCleanup(() => window.removeEventListener('keydown', onKeyDown))

  useBeforeLeave(e => {
    if (!dirty || e.defaultPrevented) return
    e.preventDefault()
    if (window.confirm('You have unsaved changes. Leave without saving?')) e.retry(true)
  })

  return (
    <div>
      <div class="bg-gray-200">
        <button class="rounded border border-gray-400 bg-white px-4 py-2 font-semibold text-gray-800 shadow hover:bg-gray-100">
          Highlight
        </button>
      </div>
      <div class="mx-20">
        <Editor doc={document} />
      </div>
    </div>
  )
}

export default function View() {
  const params: { uuid: string } = useParams<{
    uuid: string
  }>()
  const [data, { refetch }] = createResource(() => params.uuid, uuid => DocumentAPI.file_read_by_uuid(uuid))

  return (
    <Switch fallback={<>Loading...</>}>
      {/* Checked first: reading an errored resource throws */}
      <Match when={data.error as unknown}>
        <ErrorPanel title="Could not open this note" message={String(data.error)} onRetry={() => void refetch()} />
      </Match>
      <Match when={data()} keyed>
        {text => <Processor text={text} uuid={params.uuid} />}
      </Match>
    </Switch>
  )
}
