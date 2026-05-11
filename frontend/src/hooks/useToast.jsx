import { createContext, useContext, useState, useCallback } from 'react'
import { Toaster } from '@/components/ui/Toast'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback(({ type = 'info', message, duration = 4500 }) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    return id
  }, [])

  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  const { push, dismiss } = ctx
  return {
    success: (message, opts) => push({ type: 'success', message, ...opts }),
    error:   (message, opts) => push({ type: 'error',   message, duration: 6000, ...opts }),
    info:    (message, opts) => push({ type: 'info',    message, ...opts }),
    warning: (message, opts) => push({ type: 'warning', message, ...opts }),
    dismiss,
  }
}
