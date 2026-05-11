import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, BookOpen, LayoutDashboard, Brain, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/Button'
import { NotificationBell } from '@/components/layout/NotificationBell'

function dashboardPath(role) {
  if (role === 'ADMIN')     return '/admin/dashboard'
  if (role === 'PROFESSOR') return '/professor/dashboard'
  return '/student/dashboard'
}

export function Navbar() {
  const { user, logout, isAdmin, isProfessor } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 backdrop-blur-md border-b border-slate-200"
      style={{ background: 'color-mix(in srgb, var(--qm-card) 88%, transparent)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-blue-600 rounded-lg p-1.5">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">QuizMaster</span>
          </Link>

          <div className="flex items-center gap-1">
            {user && (
              <>
                <Link
                  to={dashboardPath(user.role)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>

                {(isAdmin || isProfessor) && (
                  <Link
                    to={isAdmin ? '/admin/ai' : '/professor/ai'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">AI Generator</span>
                  </Link>
                )}

                <div className="h-6 w-px bg-slate-200 mx-1" />

                <Link to="/profile" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 transition-colors">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-medium text-slate-900 leading-none">{user.full_name}</span>
                    <span className="text-xs text-slate-500 mt-0.5">{user.role}</span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {user.full_name?.[0]?.toUpperCase()}
                  </div>
                </Link>

                <NotificationBell />

                <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-1">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Dark / Light toggle */}
            <button
              onClick={toggle}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark
                ? <Sun className="h-4 w-4 text-amber-400" />
                : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
