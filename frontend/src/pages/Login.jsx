import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Brain, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody } from '@/components/ui/Card'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setApiError('')
    try {
      const user = await login(data.email, data.password)
      const dest = user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'PROFESSOR' ? '/professor/dashboard' : '/student/dashboard'
      navigate(dest, { replace: true })
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4"
          >
            <Brain className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to QuizMaster</p>
        </div>

        <Card>
          <CardBody className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {apiError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700"
                >
                  {apiError}
                </motion.div>
              )}

              <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:underline">
                Create one
              </Link>
            </div>
          </CardBody>
        </Card>

        {/* Demo credentials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm"
        >
          <p className="font-medium text-amber-800 mb-2">Demo credentials</p>
          <div className="space-y-1 text-amber-700 font-mono text-xs">
            <p>Admin:     admin@demo.com / admin1234</p>
            <p>Professor: professor@demo.com / prof1234</p>
            <p>Student:   student@demo.com / student1234</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
