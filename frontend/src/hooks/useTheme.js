import { useState, useEffect } from 'react'

const STORAGE_KEY = 'qm-theme'

function applyTheme(dark) {
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    applyTheme(isDark)
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  // Apply immediately on mount (avoids flash)
  useEffect(() => {
    applyTheme(isDark)
  }, [])

  const toggle = () => setIsDark(v => !v)

  return { isDark, toggle }
}
