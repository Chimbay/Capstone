import { Accessor, For } from 'solid-js'
import { ToastType } from './ToastContext'

type Toast = {
  id: string
  message: string
  type: ToastType
}

export default function ToastContainer(props: { toasts: Accessor<Toast[]> }) {
  return (
    <div class="fixed right-4 bottom-4 z-50 space-y-2">
      <For each={props.toasts()}>
        {(toast: Toast) => (
          <div
            class={`rounded px-4 py-2 text-white shadow ${toast.type === 'success' && 'bg-green-600'} ${toast.type === 'error' && 'bg-red-600'} ${toast.type === 'info' && 'bg-gray-800'} `}
          >
            {toast.message}
          </div>
        )}
      </For>
    </div>
  )
}
