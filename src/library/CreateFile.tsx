import { DocumentAPI } from '@api/document'
import { createSignal, Show } from 'solid-js'

export default function CreateFile(props: { class?: string }) {
  const [showForm, setShowForm] = createSignal(false)

  function handleSubmit(e: SubmitEvent): void {
    e.preventDefault()

    const form = e.target as HTMLFormElement
    const nameInput = form.elements.namedItem('file_name') as HTMLInputElement
    const title = nameInput.value.trim()
    if (!title) return

    void DocumentAPI.create_new_file({ display_name: title })
  }

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        class={`flex min-h-16 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-700 ${props.class}`}
      >
        <span class="text-lg leading-none">+</span>
        New document
      </button>
      <Show when={showForm()}>
        <div class="fixed inset-0 z-10 flex items-center justify-center bg-gray-500/60">
          <div class="flex w-80 flex-col gap-4 rounded-xl bg-white p-6 shadow-xl">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-gray-800">New document</h2>
              <button
                onClick={() => setShowForm(false)}
                class="text-xl leading-none text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form class="flex flex-col gap-3" onSubmit={handleSubmit}>
              <input
                name="file_name"
                type="text"
                placeholder="File name"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
              />

              <button
                type="submit"
                class="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
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
