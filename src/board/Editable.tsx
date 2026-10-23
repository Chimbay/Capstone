import { createSignal, Show, type JSX } from 'solid-js'

// Inline editor: shows `children` until double-clicked, then an input that saves on blur or Enter (Ctrl+Enter when multiline); Escape cancels.
export default function Editable(props: {
  value: string
  multiline?: boolean
  onSave: (value: string) => void
  // Rendered next to the multiline textarea while it's open, e.g. a formatting toolbar
  toolbar?: (el: HTMLTextAreaElement) => JSX.Element
  // The multiline textarea's text style, in place of the card's small body text
  textClass?: string
  children: JSX.Element
}) {
  const [editing, setEditing] = createSignal(false)
  const save = (value: string) => {
    setEditing(false)
    if (value !== props.value) props.onSave(value)
  }
  // The input's starting text is read in the JSX below, each time editing begins. A `value` here
  // would be read once at mount, so a second edit would start from stale text and save it.
  const field = {
    ref: (el: HTMLInputElement | HTMLTextAreaElement) =>
      queueMicrotask(() => el.select()),
    class: 'nodrag nopan nowheel w-full outline-none',
    // Escape removes the input, which blurs it; editing() is already false by then, so nothing is saved.
    onBlur: (e: FocusEvent) =>
      editing() && save((e.currentTarget as HTMLInputElement).value),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditing(false)
      // Cards are multi-line, so plain Enter is a new line there and Ctrl+Enter finishes
      else if (e.key === 'Enter' && (!props.multiline || e.ctrlKey || e.metaKey))
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
      {props.multiline ? (
        (() => {
          const el = (
            <textarea
              rows={3}
              {...field}
              // Blends into the card: same font and wrapping as the displayed text, no box of its own
              class={`${field.class} h-full resize-none bg-transparent p-0 whitespace-pre-wrap ${props.textClass ?? 'text-sm'}`}
              value={props.value}
            />
          ) as HTMLTextAreaElement
          return (
            <>
              {el}
              {props.toolbar?.(el)}
            </>
          )
        })()
      ) : (
        <input
          {...field}
          class={`${field.class} rounded bg-(--xy-background-color) px-1 font-mono text-xs text-zinc-950 focus:ring-1 focus:ring-blue-500 dark:text-white dark:focus:ring-indigo-400`}
          value={props.value}
        />
      )}
    </Show>
  )
}
