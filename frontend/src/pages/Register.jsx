import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Brain, Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody } from '@/components/ui/Card'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
  role: z.enum(['STUDENT', 'ADMIN']),
}).refine(d => d.password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

export default function Register() {
  const { register: authRegister } = useAuth()
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'STUDENT' },
  })

  const onSubmit = async ({ confirm_password, ...data }) => {
    setApiError('')
    try {
      const user = await authRegister(data)
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Registration failed. Please try again.')
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
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 text-sm mt-1">Join QuizMaster today</p>
        </div>

        <Card>
          <CardBody className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full name"
                placeholder="Jane Smith"
                error={errors.full_name?.message}
                {...register('full_name')}
              />

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
                  placeholder="Min 8 characters"
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

              <Input
                label="Confirm password"
                type={showPw ? 'text' : 'password'}
                placeholder="Repeat password"
                error={errors.confirm_password?.message}
                {...register('confirm_password')}
              />

              {/* Role selector */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  {['STUDENT', 'ADMIN'].map(role => (
                    <label
                      key={role}
                      className="relative flex items-center justify-center gap-2 border rounded-lg p-3 cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 border-slate-200 hover:border-slate-300"
                    >
                      <input type="radio" value={role} className="sr-only" {...register('role')} />
                      <span className="text-sm font-medium text-slate-700">
                        {role === 'STUDENT' ? '🎓 Student' : '👩‍💼 Admin'}
                      </span>
                    </label>
                  ))}
                </div>
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
                <UserPlus className="h-4 w-4" />
                Create account
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:underline">
                Sign in
              </Link>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  )
}
