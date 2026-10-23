import { createEffect, createSignal, For, onCleanup, Show, type JSX } from 'solid-js'

export type CreateItem = {
  label: string // menu entry, e.g. "Note"; the prompt is titled "New <label lowercased>"
  icon?: JSX.Element
  onCreate: (name: string) => void
}

// "+ New" button with a menu of things to create; each opens a name prompt.
export default function CreateFile(props: { items: CreateItem[]; class?: string }) {
  const [menuOpen, setMenuOpen] = createSignal(false)
  const [chosen, setChosen] = createSignal<CreateItem>()
  let wrapper: HTMLDivElement | undefined

  createEffect(() => {
    if (!menuOpen()) return
    const onPointer = (e: PointerEvent): void => {
      if (!wrapper?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    })
  })

  function handleSubmit(e: SubmitEvent): void {
    e.preventDefault()

    const form = e.target as HTMLFormElement
    const nameInput = form.elements.namedItem('file_name') as HTMLInputElement
    const title = nameInput.value.trim()
    if (!title) return

    chosen()?.onCreate(title)
    setChosen(undefined)
  }

  return (
    <>
      <div ref={wrapper} class={`relative ${props.class ?? ''}`}>
        <button
          aria-haspopup="menu"
          aria-expanded={menuOpen()}
          onClick={() => setMenuOpen(!menuOpen())}
          class="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-200"
        >
          <span class="text-lg leading-none">+</span>
          New
        </button>
        <Show when={menuOpen()}>
          <div
            role="menu"
            class="absolute inset-x-0 top-full z-10 mt-1 flex flex-col rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
          >
            <For each={props.items}>
              {item => (
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setChosen(item)
                  }}
                  class="flex items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {item.icon}
                  {item.label}
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>
      <Show when={chosen()}>
        {item => (
          <div class="fixed inset-0 z-10 flex items-center justify-center bg-gray-500/60 dark:bg-black/60">
            <div class="flex w-80 flex-col gap-4 rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-800">
              <div class="flex items-center justify-between">
                <h2 class="font-semibold text-gray-800 dark:text-zinc-100">
                  New {item().label.toLowerCase()}
                </h2>
                <button
                  onClick={() => setChosen(undefined)}
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
        )}
      </Show>
    </>
  )
}
