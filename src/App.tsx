import ToastProvider from '@ui/toast/ToastProvider'
import type { JSX, ParentComponent } from 'solid-js'

const App: ParentComponent = (props: { children: JSX.Element }) => {
  return <ToastProvider>{props.children}</ToastProvider>
}

export default App
