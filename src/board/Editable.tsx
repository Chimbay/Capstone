import { createSignal, Show, type JSX } from 'solid-js'

// Inline editor: shows `children` until double-clicked, then an input that saves on blur or Enter; Escape cancels.
export default function Editable(props: {
  value: string
  multiline?: boolean
  onSave: (value: string) => void
  children: JSX.Element
}) {
  const [editing, setEditing] = createSignal(false)
  const save = (value: string) => {
    setEditing(false)
    if (value !== props.value) props.onSave(value)
  }
  const field = {
    ref: (el: HTMLInputElement | HTMLTextAreaElement) =>
      queueMicrotask(() => el.select()),
    value: props.value,
    class:
      'nodrag nopan nowheel w-full resize-none border border-blue-400 bg-white text-sm outline-none',
    // Escape removes the input, which blurs it; editing() is already false by then, so nothing is saved.
    onBlur: (e: FocusEvent) =>
      editing() && save((e.currentTarget as HTMLInputElement).value),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditing(false)
      else if (e.key === 'Enter' && !(props.multiline && e.shiftKey))
        (e.currentTarget as HTMLElement).blur()
    }
  }
  return (
    <Show
      when={editing()}
      // Native listener: Solid's delegated events don't reach elements inside the flow's layers
      fallback={
        <div class="h-full w-full" on:dblclick={() => setEditing(true)}>
          {props.children}
        </div>
      }
    >
      {props.multiline ? <textarea rows={3} {...field} /> : <input {...field} />}
    </Show>
  )
}
