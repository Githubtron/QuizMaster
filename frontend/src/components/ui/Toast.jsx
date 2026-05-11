import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'

const CONFIG = {
  success: { icon: CheckCircle2, bg: '#f0fdf4', border: '#86efac', color: '#166534', iconColor: '#16a34a' },
  error:   { icon: XCircle,      bg: '#fff1f2', border: '#fecdd3', color: '#9f1239', iconColor: '#dc2626' },
  info:    { icon: Info,         bg: '#eff6ff', border: '#bfdbfe', color: '#1e3a8a', iconColor: '#2563eb' },
  warning: { icon: AlertTriangle,bg: '#fffbeb', border: '#fde68a', color: '#78350f', iconColor: '#d97706' },
}

function ToastItem({ id, type, message, onDismiss }) {
  const cfg = CONFIG[type] ?? CONFIG.info
  const Icon = cfg.icon
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 64, scale: 0.92 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{ opacity: 0, x: 64, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto max-w-sm w-full"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.iconColor }} />
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}

export function Toaster({ toasts, onDismiss }) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}
