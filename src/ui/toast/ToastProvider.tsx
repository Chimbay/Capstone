import { createSignal, JSX } from 'solid-js'
import ToastContainer from './ToastContainer'
import ToastContext, { ToastType } from './ToastContext'

type Toast = {
  id: string
  message: string
  type: ToastType
}

export default function ToastProvider(props: { children: JSX.Element }) {
  const [toasts, setToasts] = createSignal<Toast[]>([])

  function pushToast(message: string, type: ToastType) {
    const id = crypto.randomUUID()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(toast => toast.id !== id)), 3000)
  }

  const notify = (message: string) => pushToast(message, 'info')
  const success = (message: string) => pushToast(message, 'success')
  const error = (message: string) => pushToast(message, 'error')

  return (
    <ToastContext.Provider value={{ notify, success, error }}>
      {props.children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}
