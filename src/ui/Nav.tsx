import { A } from '@solidjs/router'
import { ChevronLast, House } from 'lucide-solid'
import { createSignal, JSXElement } from 'solid-js'

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
  return (
    <nav class="relative flex h-dvh w-8 bg-white">
      <div
        class="absolute z-50 h-dvh overflow-hidden bg-white shadow-xl transition-[width] duration-200"
        classList={{ 'w-32': panel(), 'w-8': !panel() }}
      >
        <div class="p-1">
          <div class="flex w-full justify-end">
            <button class="btn-ghost" onClick={() => setPanel(v => !v)}>
              <ChevronLast color="black" />
            </button>
          </div>

          <NavOption href="/" title="Home">
            <House />
          </NavOption>
        </div>
      </div>
    </nav>
  )
}
