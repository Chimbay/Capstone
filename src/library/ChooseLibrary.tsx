import { DocumentAPI } from '@api/document'
import { useNavigate } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'

// Opens the folder picker and, once a folder is chosen, reloads so every view starts fresh in it.
// Navigating home first unmounts any open board, which flushes its pending save to the old library.
export function useChooseLibrary(): { choose: () => Promise<void>; error: () => string } {
  const navigate = useNavigate()
  const [error, setError] = createSignal('')
  return {
    error,
    async choose() {
      navigate('/')
      try {
        if (await DocumentAPI.choose_library()) window.location.reload()
      } catch (err) {
        setError(String(err))
      }
    }
  }
}

// First-run popup: the app has nothing to show until a library folder is chosen.
export default function ChooseLibrary() {
  const { choose, error } = useChooseLibrary()
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/60">
      <div class="flex w-96 flex-col gap-4 rounded-xl bg-white p-6 shadow-xl">
        <h2 class="font-semibold text-gray-800">Where should Whiteboard keep your library?</h2>
        <p class="text-sm text-gray-600">
          Pick a folder for your notes and boards. They're saved there as normal files, so you can
          back them up, sync them, or open them in other apps.
        </p>
        <button
          class="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
          onClick={() => void choose()}
        >
          Choose folder…
        </button>
        <Show when={error()}>
          <p class="text-sm text-red-600">{error()}</p>
        </Show>
      </div>
    </div>
  )
}
