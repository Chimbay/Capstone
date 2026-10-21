import { A } from '@solidjs/router'
import { Show } from 'solid-js'

// What a page shows instead of its content when it can't load or has crashed.
export default function ErrorPanel(props: {
  title: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div class="flex h-full min-h-60 items-center justify-center p-6">
      <div class="flex max-w-md flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm">
        <h2 class="font-semibold text-red-800">{props.title}</h2>
        <p class="break-words text-red-700">{props.message}</p>
        <div class="flex gap-2">
          <Show when={props.onRetry}>
            {retry => (
              <button
                class="rounded border border-gray-300 bg-white px-3 py-1"
                onClick={() => retry()()}
              >
                Try again
              </button>
            )}
          </Show>
          <A href="/" class="rounded border border-gray-300 bg-white px-3 py-1">
            Home
          </A>
        </div>
      </div>
    </div>
  )
}
