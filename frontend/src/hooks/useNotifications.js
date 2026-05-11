import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'

const WS_BASE = import.meta.env.VITE_WS_URL ||
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)

  const connect = useCallback(() => {
    if (!user) return
    const token = localStorage.getItem('qm_token')
    if (!token) return

    const ws = new WebSocket(`${WS_BASE}/api/v1/ws?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const notification = { ...msg, id: Date.now(), ts: new Date().toISOString() }
        setNotifications(prev => [notification, ...prev].slice(0, 30))
        setUnread(prev => prev + 1)
      } catch { /* ignore malformed messages */ }
    }

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 5000)
    }
  }, [user])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const markAllRead = useCallback(() => setUnread(0), [])
  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return { notifications, unread, markAllRead, dismiss }
}
