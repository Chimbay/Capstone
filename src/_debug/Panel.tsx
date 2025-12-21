import { createSignal } from 'solid-js'
import FileFetch from './FileFetch'

export default function DebugPanel() {
  const [debugActive, setDebugActive] = createSignal<boolean>(true)

  function activateDebug() {
    setDebugActive(!debugActive())
  }

  return (
    <div class={''}>
      <button class={'border p-1'} onClick={() => void activateDebug()}>
        DEBUG
      </button>
      <div
        class={'p-2 bg-gray-300'}
        classList={{
          hidden: debugActive()
        }}
      >
        <FileFetch />
      </div>
    </div>
  )
}
