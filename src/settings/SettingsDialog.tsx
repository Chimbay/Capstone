import { Minus, Plus, X } from 'lucide-solid'
import { onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { RING_DELAYS, ringDelay, setRingDelay } from '.'

const step =
  'btn-ghost p-1 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent'

// Modal listing app-wide preferences; add a setting by adding one row (<li>) under its section.
export default function SettingsDialog(props: { onClose: () => void }) {
  let panel!: HTMLDivElement
  onMount(() => panel.focus())

  // ringDelay() is always one of RING_DELAYS (parseRingDelay guarantees it)
  const index = () => RING_DELAYS.indexOf(ringDelay())

  return (
    // Portal: the sidebar clips its children and sits in its own stacking context
    <Portal>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/60 p-4 dark:bg-black/60"
        onClick={e => e.target === e.currentTarget && props.onClose()}
      >
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          tabindex="-1"
          class="flex w-full max-w-lg flex-col gap-6 rounded-xl bg-white p-6 text-gray-800 shadow-xl focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
          onKeyDown={e => {
            // Keeps keys like Delete from reaching the board's window shortcuts behind the modal
            e.stopPropagation()
            if (e.key === 'Escape') props.onClose()
          }}
        >
          <div class="flex items-center justify-between">
            <h1 id="settings-title" class="text-lg font-semibold">
              Settings
            </h1>
            <button
              aria-label="Close settings"
              class="btn-ghost p-1 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              onClick={() => props.onClose()}
            >
              <X size={16} />
            </button>
          </div>

          <section class="flex flex-col gap-1">
            <h2 class="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-zinc-400">
              Board
            </h2>
            <ul class="divide-y divide-gray-200 text-sm dark:divide-zinc-700">
              <li class="flex items-center justify-between gap-4 py-3">
                <div class="min-w-0">
                  <p id="setting-ring-delay">Shape ring delay</p>
                  <p class="text-xs text-gray-500 dark:text-zinc-400">
                    How long to hold still while dragging a connector before the shape
                    picker appears.
                  </p>
                </div>
                <div
                  role="group"
                  aria-labelledby="setting-ring-delay"
                  class="flex shrink-0 items-center gap-1 rounded-md border border-gray-200 p-0.5 dark:border-zinc-700"
                >
                  <button
                    aria-label="Decrease shape ring delay"
                    class={step}
                    disabled={index() <= 0}
                    onClick={() => setRingDelay(RING_DELAYS[index() - 1])}
                  >
                    <Minus size={14} />
                  </button>
                  <span aria-live="polite" class="w-16 text-center tabular-nums">
                    {ringDelay() ? `${ringDelay()} ms` : 'Off'}
                  </span>
                  <button
                    aria-label="Increase shape ring delay"
                    class={step}
                    disabled={index() >= RING_DELAYS.length - 1}
                    onClick={() => setRingDelay(RING_DELAYS[index() + 1])}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </Portal>
  )
}
