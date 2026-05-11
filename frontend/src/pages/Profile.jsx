import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, Mail, Shield, Calendar, Pencil, Check, X } from 'lucide-react'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

const roleStyle = {
  ADMIN:     { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: 'Admin' },
  PROFESSOR: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe', label: 'Professor' },
  STUDENT:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'Student' },
}

const avatarColor = {
  ADMIN:     '#dc2626',
  PROFESSOR: '#7c3aed',
  STUDENT:   '#2563eb',
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing]   = useState(false)
  const [nameVal, setNameVal]   = useState(user?.full_name ?? '')
  const [saveErr, setSaveErr]   = useState(null)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me').then(r => r.data),
    initialData: user,
  })

  const saveMutation = useMutation({
    mutationFn: (full_name) => api.patch('/users/me', { full_name }).then(r => r.data),
    onSuccess: (data) => {
      updateUser({ full_name: data.full_name })
      setEditing(false)
      setSaveErr(null)
    },
    onError: (err) => {
      setSaveErr(err.response?.data?.detail ?? 'Could not save changes.')
    },
  })

  const handleSave = () => {
    if (!nameVal.trim()) { setSaveErr('Name cannot be empty.'); return }
    saveMutation.mutate(nameVal.trim())
  }

  const handleCancel = () => {
    setNameVal(me?.full_name ?? '')
    setEditing(false)
    setSaveErr(null)
  }

  const rs      = roleStyle[me?.role] ?? roleStyle.STUDENT
  const color   = avatarColor[me?.role] ?? '#2563eb'
  const initial = me?.full_name?.[0]?.toUpperCase() ?? '?'
  const joined  = me?.created_at
    ? new Date(me.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <div className="min-h-screen" style={{ background: 'var(--qm-bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--qm-navy)' }} className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4"
            style={{ background: color }}
          >
            {initial}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold text-white">{me?.full_name}</h1>
            <p className="text-slate-400 text-sm mt-1">{me?.email}</p>
            <span
              className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#c7d2fe', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {rs.label}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">

        {/* Account info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6"
          style={{ border: '1px solid #e0e7ff' }}
        >
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Account Info</h2>
          <div className="space-y-4">

            {/* Full name row */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-1">Full name</p>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={nameVal}
                      onChange={e => setNameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
                      className="flex-1 rounded-lg border border-indigo-300 px-3 py-1.5 text-sm text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                    <button
                      onClick={handleSave}
                      disabled={saveMutation.isPending}
                      className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-colors"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">{me?.full_name}</p>
                    <button
                      onClick={() => { setNameVal(me?.full_name ?? ''); setEditing(true) }}
                      className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  </div>
                )}
                {saveErr && <p className="text-xs text-red-500 mt-1">{saveErr}</p>}
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Email address</p>
                <p className="text-sm font-medium text-slate-800">{me?.email}</p>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Role */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Role</p>
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
                >
                  {rs.label}
                </span>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Joined */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Member since</p>
                <p className="text-sm font-medium text-slate-800">{joined}</p>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Account status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl px-6 py-4 flex items-center justify-between"
          style={{ border: '1px solid #e0e7ff' }}
        >
          <div>
            <p className="text-sm font-medium text-slate-700">Account status</p>
            <p className="text-xs text-slate-400 mt-0.5">Your account is managed by an administrator</p>
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={
              me?.is_active
                ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' }
                : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
            }
          >
            {me?.is_active ? 'Active' : 'Inactive'}
          </span>
        </motion.div>

      </div>
    </div>
  )
}
