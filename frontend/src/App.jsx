import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/hooks/useToast'
import { Navbar } from '@/components/layout/Navbar'
import { PageSpinner } from '@/components/ui/Spinner'

import Login from '@/pages/Login'
import Register from '@/pages/Register'
import StudentDashboard from '@/pages/StudentDashboard'
import AdminDashboard from '@/pages/AdminDashboard'
import ProfessorDashboard from '@/pages/ProfessorDashboard'
import TakeQuiz from '@/pages/TakeQuiz'
import Results from '@/pages/Results'
import AIGenerator from '@/pages/AIGenerator'
import Profile from '@/pages/Profile'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function roleHome(role) {
  if (role === 'ADMIN')     return '/admin/dashboard'
  if (role === 'PROFESSOR') return '/professor/dashboard'
  return '/student/dashboard'
}

// Redirect logged-in users away from /login and /register
function GuestOnly() {
  const { user } = useAuth()
  if (user) return <Navigate to={roleHome(user.role)} replace />
  return <Outlet />
}

// Require authentication; redirect to /login otherwise
function RequireAuth() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  )
}

function RequireRole({ roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />
  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Default root → redirect based on role */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public / guest routes */}
      <Route element={<GuestOnly />}>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Authenticated routes (have Navbar) */}
      <Route element={<RequireAuth />}>
        {/* Student routes */}
        <Route element={<RequireRole roles={['STUDENT']} />}>
          <Route path="/student/dashboard"       element={<StudentDashboard />} />
          <Route path="/quiz/:examId"            element={<TakeQuiz />} />
          <Route path="/results/:attemptId"      element={<Results />} />
        </Route>

        {/* Professor routes */}
        <Route element={<RequireRole roles={['PROFESSOR']} />}>
          <Route path="/professor/dashboard" element={<ProfessorDashboard />} />
          <Route path="/professor/ai"        element={<AIGenerator />} />
        </Route>

        {/* Admin routes */}
        <Route element={<RequireRole roles={['ADMIN']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/ai"        element={<AIGenerator />} />
        </Route>

        {/* Profile — all authenticated roles */}
        <Route path="/profile" element={<Profile />} />

        {/* Legacy redirects */}
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/admin"     element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={roleHome(user.role)} replace />
}

function DashboardRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={roleHome(user.role)} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
