import { createContext, useContext } from 'solid-js'

export type ToastType = 'success' | 'error' | 'info'

export type ToastContextType = {
  notify: (message: string, type?: ToastType) => void
  success: (message: string, type?: ToastType) => void
  error: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({
  notify: () => {},
  success: () => {},
  error: () => {}
})

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

export default ToastContext
