import { createSignal } from 'solid-js'
import FileFetch from './FileFetch'

export default function DebugPanel() {
  const [debugActive, setDebugActive] = createSignal<boolean>(true)

  function activateDebug() {
    setDebugActive(!debugActive())
  }

  return (
    <div class={'absolute top-0 left-0 m-1 p-1'}>
      <button class={'border p-1 bg-gray-200'} onClick={() => void activateDebug()}>
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
