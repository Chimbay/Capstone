import { Handle } from '@dschz/solid-flow'
import { For } from 'solid-js'

// A connection point on each side of a card. Any side can start or end a connector.
export default function Sides() {
  return (
    <For each={['top', 'right', 'bottom', 'left'] as const}>
      {side => <Handle type="source" position={side} id={side} />}
    </For>
  )
}
