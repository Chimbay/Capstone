import { DocumentAPI } from '@api/document'
import { createSignal, Show } from 'solid-js'

export default function CreateFile() {
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
    <div>
      <button
        onClick={() => setShowForm(true)}
        class="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors text-sm w-full justify-center"
      >
        <span class="text-lg leading-none">+</span>
        New document
      </button>
      <Show when={showForm()}>
        <div class="absolute inset-0 flex items-center justify-center bg-gray-500/60 z-10">
          <div class="flex flex-col gap-4 bg-white rounded-xl shadow-xl p-6 w-80">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-gray-800">New document</h2>
              <button
                onClick={() => setShowForm(false)}
                class="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form class="flex flex-col gap-3" onSubmit={handleSubmit}>
              <input
                name="file_name"
                type="text"
                placeholder="File name"
                class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <button
                type="submit"
                class="bg-gray-800 text-white rounded-lg px-4 py-2 text-sm hover:bg-gray-700 transition-colors"
              >
                Create
              </button>
            </form>
          </div>
        </div>
      </Show>
    </div>
  )
}
