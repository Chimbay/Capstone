import { NodeToolbar } from '@dschz/solid-flow'
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { activeFormats, insertIcon, toggleLine, toggleWrap, type Edit } from '../markdown'
import { ICON_NAMES, ICONS } from './Markdown'

type Run = (text: string, start: number, end: number) => Edit
// The buttons in order, with their shortcuts as Ctrl[+Alt][+Shift]+KeyboardEvent.code (layout-proof
// digits: Shift+8 is `*` on US keys). Icon has no `run`: it opens the picker.
const BUTTONS: {
  id: string
  glyph: string
  label: string
  keys: string
  class?: string
  run?: Run
}[] = [
  {
    id: 'bold',
    glyph: 'B',
    label: 'Bold',
    keys: 'Ctrl+KeyB',
    class: 'font-bold',
    run: (t, s, e) => toggleWrap(t, s, e, '**')
  },
  {
    id: 'italic',
    glyph: 'I',
    label: 'Italic',
    keys: 'Ctrl+KeyI',
    class: 'italic',
    run: (t, s, e) => toggleWrap(t, s, e, '*')
  },
  {
    id: 'underline',
    glyph: 'U',
    label: 'Underline',
    keys: 'Ctrl+KeyU',
    class: 'underline',
    run: (t, s, e) => toggleWrap(t, s, e, '__')
  },
  {
    id: 'h1',
    glyph: 'H1',
    label: 'Title',
    keys: 'Ctrl+Alt+Digit1',
    run: (t, s, e) => toggleLine(t, s, e, '# ')
  },
  {
    id: 'h2',
    glyph: 'H2',
    label: 'Label',
    keys: 'Ctrl+Alt+Digit2',
    run: (t, s, e) => toggleLine(t, s, e, '## ')
  },
  {
    id: 'li',
    glyph: '•',
    label: 'Bullet',
    keys: 'Ctrl+Shift+Digit8',
    run: (t, s, e) => toggleLine(t, s, e, '- ')
  },
  { id: 'icon', glyph: '', label: 'Icon', keys: 'Ctrl+Shift+KeyI' }
]
const shown = (keys: string) => keys.replace(/Key|Digit/g, '')
const COLS = 6
const MOVES: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -COLS,
  ArrowDown: COLS
}
const BOX = 'border border-zinc-950 bg-(--xy-background-color) dark:border-white'
const BTN = 'flex h-6 min-w-6 items-center justify-center px-1'
const ON = 'bg-blue-500 text-white dark:bg-indigo-400 dark:text-zinc-950'
const OFF = 'hover:bg-zinc-950/10 dark:hover:bg-white/10'

// Formatting buttons above a text card while its textarea is open. They edit the plain markdown
// in place; the textarea keeps focus throughout, so the edit is still saved or cancelled as usual.
// A heading card's text has no line prefixes, so it gets no Title/Label/Bullet buttons.
export default function FormatToolbar(props: {
  el: HTMLTextAreaElement
  id: string
  heading?: boolean
}) {
  const el = props.el
  const buttons = props.heading
    ? BUTTONS.filter(b => !['h1', 'h2', 'li'].includes(b.id))
    : BUTTONS
  const [active, setActive] = createSignal<string[]>([])
  // The highlighted icon's index while the picker is open, -1 when closed
  const [picker, setPicker] = createSignal(-1)
  const [help, setHelp] = createSignal(false)
  const refresh = () => setActive(activeFormats(el.value, el.selectionStart))
  const apply = (run: Run) => {
    const r = run(el.value, el.selectionStart, el.selectionEnd)
    el.value = r.text
    el.setSelectionRange(r.start, r.end)
    el.focus()
    refresh()
  }
  const pick = (name: string) => {
    setPicker(-1)
    apply((t, s, e) => insertIcon(t, s, e, name, props.heading))
  }
  const press = (b: (typeof BUTTONS)[number]) => {
    if (b.run) return apply(b.run)
    setHelp(false)
    setPicker(p => (p < 0 ? 0 : -1))
  }
  const optionId = (i: number) => `${props.id}-icon-${ICON_NAMES[i]}`

  // Native, at the textarea itself: stopPropagation then keeps Editable's Escape/Enter handling
  // (delegated to the document) from also seeing keys the picker or a shortcut used.
  const onKey = (e: KeyboardEvent) => {
    const p = picker()
    if (p >= 0 && (e.key in MOVES || e.key === 'Enter' || e.key === 'Escape')) {
      if (e.key === 'Enter') pick(ICON_NAMES[p])
      else if (e.key === 'Escape') setPicker(-1)
      else setPicker(Math.min(Math.max(p + MOVES[e.key], 0), ICON_NAMES.length - 1))
    } else {
      const combo = [
        e.ctrlKey || e.metaKey ? 'Ctrl' : '',
        e.altKey ? 'Alt' : '',
        e.shiftKey ? 'Shift' : '',
        e.code
      ]
        .filter(Boolean)
        .join('+')
      const b = buttons.find(b => b.keys === combo)
      // AltGr arrives as Ctrl+Alt, and AltGr+2 types `@` on some layouts
      if (!b || e.getModifierState('AltGraph')) return
      press(b)
    }
    e.preventDefault()
    e.stopPropagation()
  }
  const events = ['input', 'keyup', 'select', 'click'] as const
  el.addEventListener('keydown', onKey)
  for (const name of events) el.addEventListener(name, refresh)
  onCleanup(() => {
    el.removeEventListener('keydown', onKey)
    for (const name of events) el.removeEventListener(name, refresh)
  })
  refresh()
  // Focus stays in the textarea, so it names the highlighted icon for screen readers
  createEffect(() =>
    picker() < 0
      ? el.removeAttribute('aria-activedescendant')
      : el.setAttribute('aria-activedescendant', optionId(picker()))
  )

  const names = () =>
    active()
      .map(id => BUTTONS.find(b => b.id === id).label.toLowerCase())
      .join(' · ')
  return (
    <NodeToolbar isVisible align="start" class="nodrag nopan nowheel">
      {/* Pressing a button must not take focus: blurring the textarea would end the edit */}
      <div
        class={`${BOX} relative flex items-center gap-0.5 p-0.5 font-mono text-xs text-zinc-950 dark:text-white`}
        on:pointerdown={e => e.preventDefault()}
        on:mousedown={e => e.preventDefault()}
      >
        <For each={buttons}>
          {b => {
            const on = () => (b.run ? active().includes(b.id) : picker() >= 0)
            return (
              <button
                type="button"
                class={`${BTN} ${b.class ?? ''} ${on() ? ON : OFF}`}
                aria-label={b.label}
                title={`${b.label} (${shown(b.keys)})`}
                aria-pressed={on()}
                on:click={() => press(b)}
              >
                {b.run ? b.glyph : <Dynamic component={ICONS.star} size={14} />}
              </button>
            )
          }}
        </For>
        <span class="px-1 text-[10px] text-zinc-500 dark:text-zinc-400">{names()}</span>
        <button
          type="button"
          class={`${BTN} ${help() ? ON : OFF}`}
          aria-label="Shortcuts"
          title="Shortcuts"
          aria-pressed={help()}
          on:click={() => {
            setPicker(-1)
            setHelp(h => !h)
          }}
        >
          ?
        </button>
        {/* Popovers open upward, so they never cover the text being edited */}
        <Show when={picker() >= 0}>
          <div
            role="listbox"
            aria-label="Icons"
            class={`${BOX} absolute bottom-full left-0 mb-1 grid grid-cols-6 gap-0.5 p-1`}
          >
            <For each={ICON_NAMES}>
              {(name, i) => (
                <button
                  type="button"
                  role="option"
                  id={optionId(i())}
                  aria-selected={i() === picker()}
                  title={name}
                  class={`${BTN} ${i() === picker() ? ON : OFF}`}
                  on:click={() => pick(name)}
                >
                  <Dynamic component={ICONS[name]} size={14} />
                </button>
              )}
            </For>
          </div>
        </Show>
        <Show when={help()}>
          <dl
            class={`${BOX} absolute right-0 bottom-full mb-1 grid grid-cols-[auto_auto] gap-x-3 p-2 whitespace-nowrap`}
          >
            <For
              each={[
                ...buttons.map(b => [b.label, shown(b.keys)]),
                ['Done', 'Ctrl+Enter'],
                ['Cancel', 'Esc']
              ]}
            >
              {([label, keys]) => (
                <>
                  <dt>{label}</dt>
                  <dd class="text-zinc-500 dark:text-zinc-400">{keys}</dd>
                </>
              )}
            </For>
          </dl>
        </Show>
      </div>
    </NodeToolbar>
  )
}
