import { createSignal, Show } from 'solid-js'

// Button that opens a name prompt; used for both new notes and new folders.
export default function CreateFile(props: {
  label: string
  onCreate: (name: string) => void
  class?: string
}) {
  const [showForm, setShowForm] = createSignal(false)

  function handleSubmit(e: SubmitEvent): void {
    e.preventDefault()

    const form = e.target as HTMLFormElement
    const nameInput = form.elements.namedItem('file_name') as HTMLInputElement
    const title = nameInput.value.trim()
    if (!title) return

    props.onCreate(title)
    setShowForm(false)
  }

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        class={`flex min-h-10 min-w-24 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-200 ${props.class}`}
      >
        <span class="text-lg leading-none">+</span>
        {props.label}
      </button>
      <Show when={showForm()}>
        <div class="fixed inset-0 z-10 flex items-center justify-center bg-gray-500/60 dark:bg-black/60">
          <div class="flex w-80 flex-col gap-4 rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-800">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-gray-800 dark:text-zinc-100">
                {props.label}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                class="text-xl leading-none text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                ×
              </button>
            </div>

            <form class="flex flex-col gap-3" onSubmit={handleSubmit}>
              <input
                name="file_name"
                type="text"
                placeholder="Name"
                autofocus
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              />

              <button
                type="submit"
                class="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500"
              >
                Create
              </button>
            </form>
          </div>
        </div>
      </Show>
    </>
  )
}
