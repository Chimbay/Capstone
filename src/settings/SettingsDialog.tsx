import { For, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { RING_DELAYS, ringDelay, setRingDelay } from '.'

// Modal listing app-wide preferences; add a setting by adding one <li>.
export default function SettingsDialog(props: { onClose: () => void }) {
  let panel!: HTMLDivElement
  onMount(() => panel.focus())

  return (
    // Portal: the nav panel clips its children and sits in its own stacking context
    <Portal>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/60 dark:bg-black/60"
        onClick={e => e.target === e.currentTarget && props.onClose()}
      >
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          tabindex="-1"
          class="flex w-96 max-w-[calc(100%-2rem)] flex-col gap-4 rounded-xl bg-white p-6 text-gray-800 shadow-xl focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
          onKeyDown={e => {
            // Keeps keys like Delete from reaching the board's window shortcuts behind the modal
            e.stopPropagation()
            if (e.key === 'Escape') props.onClose()
          }}
        >
          <h2 id="settings-title" class="font-semibold">
            Whiteboard settings
          </h2>

          <ul class="flex flex-col gap-4 text-sm">
            <li class="flex flex-col gap-1">
              <div class="flex items-center justify-between gap-2">
                <label for="setting-ring-delay">Shape ring delay</label>
                <select
                  id="setting-ring-delay"
                  aria-describedby="setting-ring-delay-desc"
                  class="rounded border border-gray-300 px-1 py-0.5 focus:ring-2 focus:ring-gray-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                  onChange={e => setRingDelay(Number(e.currentTarget.value))}
                >
                  <For each={RING_DELAYS}>
                    {ms => (
                      <option value={ms} selected={ms === ringDelay()}>
                        {ms ? `${ms} ms` : 'Off'}
                      </option>
                    )}
                  </For>
                </select>
              </div>
              <p id="setting-ring-delay-desc" class="text-gray-500 dark:text-zinc-400">
                How long to hold still while dragging a connector before the shape picker
                appears. Off disables the picker.
              </p>
            </li>
          </ul>

          <button
            onClick={() => props.onClose()}
            class="self-end rounded-lg bg-gray-800 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </Portal>
  )
}
