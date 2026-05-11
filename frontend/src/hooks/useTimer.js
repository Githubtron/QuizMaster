import { useState, useEffect, useRef, useCallback } from 'react'

export function useTimer(durationSeconds, onExpire) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  // Reset remaining whenever the duration prop changes (e.g. after examMeta loads)
  useEffect(() => {
    setRemaining(durationSeconds)
  }, [durationSeconds])

  useEffect(() => {
    if (remaining <= 0) {
      onExpireRef.current?.()
      return
    }
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(id)
          onExpireRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [durationSeconds]) // restart interval when the real duration is known

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const fraction = durationSeconds > 0 ? remaining / durationSeconds : 0
  const isLow = fraction < 0.2
  const isCritical = fraction < 0.08

  return { remaining, minutes, seconds, fraction, isLow, isCritical }
}
