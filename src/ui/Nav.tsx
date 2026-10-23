import { A } from '@solidjs/router'
import { ChevronLast, House, Settings } from 'lucide-solid'
import { createSignal, JSXElement, Show } from 'solid-js'
import SettingsDialog from '../settings/SettingsDialog'

function NavOption(props: { title: string; href: string; children?: JSXElement }) {
  return (
    <A href={props.href} end class="btn-ghost flex items-center">
      <span class="w-8 shrink-0 items-center justify-center">{props.children}</span>
      <span class="whitespace-nowrap">{props.title}</span>
    </A>
  )
}
export default function Nav() {
  const [panel, setPanel] = createSignal(false)
  const [settings, setSettings] = createSignal(false)
  return (
    <nav class="relative flex h-dvh w-8 bg-white dark:bg-zinc-900">
      <div
        class="absolute z-50 h-dvh overflow-hidden bg-white shadow-xl transition-[width] duration-200 dark:bg-zinc-800"
        classList={{ 'w-32': panel(), 'w-8': !panel() }}
      >
        <div class="flex h-full flex-col p-1">
          <div class="flex w-full justify-end">
            <button class="btn-ghost" onClick={() => setPanel(v => !v)}>
              <ChevronLast />
            </button>
          </div>

          <NavOption href="/" title="Home">
            <House />
          </NavOption>

          <button
            aria-label="Settings"
            title="Settings"
            class="btn-ghost mt-auto flex items-center"
            onClick={() => setSettings(true)}
          >
            <span class="w-8 shrink-0 items-center justify-center">
              <Settings />
            </span>
            <span class="whitespace-nowrap">Settings</span>
          </button>
        </div>
      </div>
      <Show when={settings()}>
        <SettingsDialog onClose={() => setSettings(false)} />
      </Show>
    </nav>
  )
}
