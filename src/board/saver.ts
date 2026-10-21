import { DocumentAPI } from '@api/document'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { createSignal, onCleanup } from 'solid-js'

// Saves a board 500ms after the last change, without overwriting edits made to the file outside the app.
// Call inside the board component: it registers cleanups that flush a pending save on unmount,
// window close and reload.
export function createSaver(opts: {
  uuid: string
  // The text the board was loaded from.
  text: string
  // The live canvas as file text.
  serialize: () => string
  error: (message: string) => void
}) {
  // The exact text last read from or written to disk; anything else there was written by someone else.
  let disk = opts.text
  const [conflict, setConflict] = createSignal(false)

  const write = async (overwrite = false) => {
    if (conflict() && !overwrite) return
    const text = opts.serialize()
    try {
      // shortcut: read-compare-write has a tiny race (an outside write between the read and the save is lost);
      // move the compare into the backend (compare-and-swap in file_save) if boards get synced or shared live.
      if (!overwrite && (await DocumentAPI.file_read_by_uuid(opts.uuid)) !== disk) {
        setConflict(true)
        opts.error('Board not saved: the file was changed outside the app.')
        return
      }
      if (text !== disk) await DocumentAPI.file_save(opts.uuid, text)
      disk = text
    } catch (err) {
      opts.error(`Board not saved: ${String(err)}`)
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  // Saves run one after another, so two never interleave their read and write.
  let saving = Promise.resolve()
  const save = (overwrite = false) => {
    clearTimeout(timer)
    timer = undefined
    return (saving = saving.then(() => write(overwrite)))
  }
  const flush = () => (timer ? save() : saving)

  // Leaving the board flushes a pending save instead of dropping it.
  onCleanup(() => void flush())
  // So does closing the window: with a JS listener, Tauri holds the close and the API destroys the window after it.
  const unlistenClose = getCurrentWindow().onCloseRequested(async e => {
    await flush()
    if (!conflict()) return
    e.preventDefault()
    opts.error('This board changed on disk. Reload or overwrite it before closing.')
  })
  onCleanup(() => void unlistenClose.then(unlisten => unlisten()))
  // A reload tears the page down before a read could answer, so the pending save is sent unchecked.
  // shortcut: an outside edit in the last 500ms before a reload gets overwritten; upgrade with the backend compare-and-swap.
  const onPageHide = () => {
    if (!timer || conflict()) return
    clearTimeout(timer)
    timer = undefined
    void write(true)
  }
  window.addEventListener('pagehide', onPageHide)
  onCleanup(() => window.removeEventListener('pagehide', onPageHide))

  return {
    conflict,
    // Saves 500ms after the last call.
    schedule() {
      clearTimeout(timer)
      timer = setTimeout(() => void save(), 500)
    },
    // Writes the canvas over whatever is on disk and clears the conflict.
    overwrite() {
      setConflict(false)
      void save(true)
    }
  }
}
