import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, BookOpen, Award, Info } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

const ICONS = {
  NEW_EXAM:   { Icon: BookOpen, color: '#4338ca', bg: '#eef2ff' },
  SUBMISSION: { Icon: Award,    color: '#059669', bg: '#f0fdf4' },
}

function icon(type) {
  return ICONS[type] ?? { Icon: Info, color: '#2563eb', bg: '#eff6ff' }
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export function NotificationBell() {
  const { notifications, unread, markAllRead, dismiss } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = () => {
    setOpen(v => !v)
    if (!open) markAllRead()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ background: '#dc2626' }}
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-xl overflow-hidden z-50"
            style={{ background: 'var(--qm-card)', border: '1px solid var(--qm-border)' }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--qm-border)' }}
            >
              <span className="text-sm font-semibold text-slate-900">Notifications</span>
              {notifications.length > 0 && (
                <button
                  onClick={() => { notifications.forEach(n => dismiss(n.id)); setOpen(false) }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs text-slate-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => {
                  const { Icon, color, bg } = icon(n.type)
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      style={{ borderBottom: '1px solid var(--qm-border-sub)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: bg }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.ts)}</p>
                      </div>
                      <button onClick={() => dismiss(n.id)} className="opacity-40 hover:opacity-70 transition-opacity flex-shrink-0 mt-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
