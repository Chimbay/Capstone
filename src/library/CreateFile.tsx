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
      <button onClick={() => setShowForm(true)}>Add</button>
      <Show when={showForm()}>
        <form class="flex flex-col" onSubmit={handleSubmit}>
          <label>
            <span>File name:</span>
            <input name="file_name" class="border" type="text" />
          </label>
          <button type="submit">Create</button>
        </form>
      </Show>
    </div>
  )
}
