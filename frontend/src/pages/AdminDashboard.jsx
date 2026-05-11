import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  LayoutDashboard, FileText, BookOpen, Users, Plus, Trash2, Zap,
  CheckCircle2, BarChart2, ToggleLeft, ToggleRight, X, Brain,
  Pencil, Sparkles, Download, UserPlus, Search, TrendingUp, Award,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import api from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'

// ── PDF download helper ────────────────────────────────────────────────────────
async function handleDownload(endpoint, filename) {
  const response = await api.get(endpoint, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// ── Schemas ────────────────────────────────────────────────────────────────────
const examSchema = z.object({
  title:            z.string().min(1, 'Title is required').max(255),
  description:      z.string().optional(),
  category_id:      z.string().min(1, 'Category is required'),
  duration_minutes: z.coerce.number().int().min(1).max(480),
  total_questions:  z.coerce.number().int().min(1).max(200),
  num_sets:         z.coerce.number().int().min(1).max(26),
})

const createUserSchema = z.object({
  email:     z.string().email('Valid email required'),
  password:  z.string().min(8, 'At least 8 characters'),
  full_name: z.string().min(1, 'Name is required'),
  role:      z.enum(['PROFESSOR', 'STUDENT']),
})

// ── ExamFormModal ──────────────────────────────────────────────────────────────
function ExamFormModal({ initial, categories, onClose, onSaved }) {
  const isEdit = !!initial?.id
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(examSchema),
    defaultValues: { num_sets: 1, duration_minutes: 60, total_questions: 20, ...initial },
  })

  const onSubmit = async (data) => {
    if (isEdit) await api.patch(`/exams/${initial.id}`, data)
    else         await api.post('/exams/', data)
    onSaved()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.78)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: '0 24px 64px rgba(10,22,40,0.35)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4"
          style={{ background: 'var(--qm-navy)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="font-bold text-white">{isEdit ? 'Edit Exam' : 'Create Exam'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <Input label="Title" {...register('title')} error={errors.title?.message} placeholder="e.g. Mid-Semester Examination 2024" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea {...register('description')} rows={2} placeholder="Brief overview…" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none resize-none transition-all" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Category</label>
            <select {...register('category_id')} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white outline-none">
              <option value="">Select a category...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.category_id && <p className="text-xs text-red-500">{errors.category_id.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Duration (min)" type="number" min={1} max={480} {...register('duration_minutes')} error={errors.duration_minutes?.message} />
            <Input label="Questions" type="number" min={1} max={200} {...register('total_questions')} error={errors.total_questions?.message} />
            <Input label="Sets (A–Z)" type="number" min={1} max={26} {...register('num_sets')} error={errors.num_sets?.message} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>{isEdit ? 'Save Changes' : 'Create Exam'}</Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── CreateUserModal ────────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onSaved }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'STUDENT' },
  })

  const onSubmit = async (data) => {
    await api.post('/admin/users', data)
    onSaved()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.78)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: '0 24px 64px rgba(10,22,40,0.35)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4"
          style={{ background: 'var(--qm-navy)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="font-bold text-white">Create Account</h2>
            <p className="text-xs text-slate-400 mt-0.5">Create a professor or student account</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <Input label="Full Name" {...register('full_name')} error={errors.full_name?.message} placeholder="e.g. Dr. Jane Smith" />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} placeholder="user@university.edu" />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} placeholder="Min 8 characters" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Role</label>
            <select {...register('role')} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white outline-none">
              <option value="STUDENT">Student</option>
              <option value="PROFESSOR">Professor</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>Create Account</Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard },
  { id: 'exams',     label: 'Exams',     icon: FileText },
  { id: 'questions', label: 'Questions', icon: BookOpen },
  { id: 'users',     label: 'Users',     icon: Users },
]

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl px-3 py-2 shadow-lg border border-slate-100 text-xs">
      <p className="font-mono font-bold text-slate-800">{payload[0].value?.toFixed ? `${payload[0].value.toFixed(1)}%` : payload[0].value}</p>
      <p className="text-slate-400">{payload[0].payload.name}</p>
    </div>
  )
}

const USER_ROLE_FILTERS = ['ALL', 'ADMIN', 'PROFESSOR', 'STUDENT']

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [activeTab, setActiveTab]             = useState('overview')
  const [examModalOpen, setExamModalOpen]     = useState(false)
  const [editingExam, setEditingExam]         = useState(null)
  const [createUserOpen, setCreateUserOpen]   = useState(false)
  const [deletingExamId, setDeletingExamId]   = useState(null)
  const [generatingId, setGeneratingId]       = useState(null)
  const [downloadingReport, setDownloadingReport] = useState(false)
  const [qFilter, setQFilter]                 = useState({ category_id: '', difficulty: '' })
  const [userSearch, setUserSearch]           = useState('')
  const [userRoleFilter, setUserRoleFilter]   = useState('ALL')

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: () => api.get('/exams/').then(r => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories/').then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    enabled: activeTab === 'overview',
  })

  const { data: analytics } = useQuery({
    queryKey: ['platform-analytics'],
    queryFn: () => api.get('/analytics/platform').then(r => r.data),
    enabled: activeTab === 'overview',
  })

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['admin-questions', qFilter],
    queryFn: () => {
      const p = new URLSearchParams()
      if (qFilter.category_id) p.set('category_id', qFilter.category_id)
      if (qFilter.difficulty)  p.set('difficulty', qFilter.difficulty)
      return api.get(`/questions/?${p}`).then(r => r.data)
    },
    enabled: activeTab === 'questions',
  })

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
    enabled: activeTab === 'users',
  })

  const deleteExam = useMutation({
    mutationFn: id => api.delete(`/exams/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-exams'] }); setDeletingExamId(null) },
  })

  const toggleExam = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/exams/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-exams'] }),
  })

  const deleteQuestion = useMutation({
    mutationFn: id => api.delete(`/questions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-questions'] }),
  })

  const deactivateUser = useMutation({
    mutationFn: id => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const handleGenerateSets = async (examId) => {
    setGeneratingId(examId)
    try { await api.post(`/sets/${examId}/generate`) }
    catch (err) { alert(err.response?.data?.detail || 'Failed to generate sets') }
    finally { setGeneratingId(null) }
  }

  const handlePlatformReport = async () => {
    setDownloadingReport(true)
    try { await handleDownload('/reports/admin/platform', 'platform_report.pdf') }
    catch { alert('Failed to download report') }
    finally { setDownloadingReport(false) }
  }

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

  // Filtered users
  const filteredUsers = users.filter(u => {
    if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false
    if (userSearch) {
      const q = userSearch.toLowerCase()
      if (!u.full_name?.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    }
    return true
  })

  const userCountByRole = {
    ALL: users.length,
    ADMIN: users.filter(u => u.role === 'ADMIN').length,
    PROFESSOR: users.filter(u => u.role === 'PROFESSOR').length,
    STUDENT: users.filter(u => u.role === 'STUDENT').length,
  }

  // Charts data
  const examBarData = analytics?.exam_stats?.slice(0, 8).map(e => ({
    name: e.exam_title.slice(0, 12),
    attempts: e.attempts,
    avg: e.avg_score ?? 0,
  })) ?? []

  const passFailData = analytics && analytics.submitted > 0
    ? [
        { name: 'Pass (≥60%)', value: Math.round(analytics.submitted * analytics.pass_rate / 100), color: '#059669' },
        { name: 'Fail (<60%)', value: analytics.submitted - Math.round(analytics.submitted * analytics.pass_rate / 100), color: '#ef4444' },
      ]
    : []

  if (examsLoading) return <PageSpinner />

  return (
    <div className="min-h-screen" style={{ background: 'var(--qm-bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--qm-navy)' }} className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-xs font-mono text-indigo-400 uppercase tracking-[0.2em] mb-2">Admin Panel</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Control Center</h1>
                <p className="text-slate-400 text-sm mb-6">Manage exams, questions, professors, and students</p>
              </div>
              <Button size="sm" variant="outline" onClick={handlePlatformReport} loading={downloadingReport}
                className="border-white/20 text-white hover:bg-white/10 hidden sm:flex">
                <Download className="w-4 h-4" />
                Platform Report
              </Button>
            </div>
          </motion.div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => {
              const active = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all"
                  style={{ color: active ? 'white' : '#64748b', borderBottom: active ? '2px solid #6366f1' : '2px solid transparent' }}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* Top stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Exams',   value: stats?.total_exams ?? exams.length,               accent: '#1d4ed8', icon: FileText },
                { label: 'Professors',    value: stats?.total_professors ?? '—',                    accent: '#7c3aed', icon: Users },
                { label: 'Students',      value: stats?.total_students ?? '—',                      accent: '#059669', icon: Users },
                { label: 'Pass Rate',     value: stats?.pass_rate != null ? `${stats.pass_rate}%` : '—', accent: '#d97706', icon: Brain },
              ].map(({ label, value, accent, icon: Icon }) => (
                <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-5 flex items-center gap-4"
                  style={{ border: `1px solid ${accent}22`, boxShadow: '0 2px 8px rgba(30,64,175,0.05)' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent + '18' }}>
                    <Icon className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-bold text-slate-800">{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Attempt counters */}
            {stats && (
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total Attempts', value: stats.total_attempts, accent: '#6366f1' },
                  { label: 'Passed',         value: stats.pass_count,     accent: '#059669' },
                  { label: 'Failed',         value: stats.fail_count,     accent: '#dc2626' },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${accent}22` }}>
                    <p className="font-mono text-3xl font-bold" style={{ color: accent }}>{value ?? '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Charts row */}
            {examBarData.length > 0 && (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Exam attempts bar chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6" style={{ border: '1px solid #e0e7ff' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Attempts per Exam</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={examBarData} margin={{ top: 4, right: 4, left: -24, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v, n) => [v, n === 'attempts' ? 'Attempts' : 'Avg Score']} cursor={{ fill: '#eef2ff' }} />
                      <Bar dataKey="attempts" radius={[6, 6, 0, 0]} maxBarSize={36} fill="#6366f1" fillOpacity={0.8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pass / Fail donut */}
                {passFailData.some(d => d.value > 0) && (
                  <div className="bg-white rounded-2xl p-6 flex flex-col" style={{ border: '1px solid #e0e7ff' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Pass / Fail</h2>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={passFailData} cx="50%" cy="50%" innerRadius={52} outerRadius={74}
                            dataKey="value" paddingAngle={3}>
                            {passFailData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => [v, 'Students']} />
                          <Legend iconType="circle" iconSize={8}
                            formatter={(v) => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Avg score per exam (secondary bar) */}
            {examBarData.length > 0 && (
              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e0e7ff' }}>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Average Score per Exam</h2>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={examBarData} margin={{ top: 4, right: 4, left: -24, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#eef2ff' }} />
                    <Bar dataKey="avg" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {examBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.avg >= 60 ? '#059669' : '#ef4444'} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── EXAMS ── */}
        {activeTab === 'exams' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                All Exams <span className="font-mono text-indigo-600 ml-2">({exams.length})</span>
              </h2>
              <Button size="sm" onClick={() => { setEditingExam(null); setExamModalOpen(true) }}>
                <Plus className="w-4 h-4" /> Create Exam
              </Button>
            </div>

            {exams.length === 0 ? (
              <div className="rounded-2xl p-12 text-center text-slate-400" style={{ background: 'white', border: '1px solid #e0e7ff' }}>
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No exams yet. Create your first one.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e0e7ff' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e0e7ff' }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Q's</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Sets</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam, i) => (
                      <tr key={exam.id} className="group" style={{ borderBottom: i < exams.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 truncate max-w-[200px]">{exam.title}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{exam.duration_minutes} min</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">
                          {catMap[exam.category_id] ?? exam.category_id.slice(0, 8) + '…'}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 hidden sm:table-cell">{exam.total_questions}</td>
                        <td className="px-4 py-3 text-center font-mono text-slate-500 hidden sm:table-cell">{exam.num_sets}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleExam.mutate({ id: exam.id, is_active: !exam.is_active })} className="transition-transform hover:scale-110">
                            {exam.is_active ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => handleGenerateSets(exam.id)} disabled={generatingId === exam.id}
                              title="Generate paper sets" className="p-2 rounded-lg hover:bg-indigo-50 text-slate-300 hover:text-indigo-500 transition-colors disabled:opacity-40">
                              {generatingId === exam.id ? <span className="text-xs font-mono text-indigo-400">…</span> : <Zap className="w-4 h-4" />}
                            </button>
                            <button onClick={() => { setEditingExam(exam); setExamModalOpen(true) }} title="Edit exam"
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {deletingExamId === exam.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <button onClick={() => deleteExam.mutate(exam.id)} className="px-2 py-1 rounded-md text-xs font-semibold bg-red-500 text-white hover:bg-red-600">Confirm</button>
                                <button onClick={() => setDeletingExamId(null)} className="px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeletingExamId(exam.id)} title="Delete exam"
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {activeTab === 'questions' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Question Bank</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={qFilter.category_id} onChange={e => setQFilter(f => ({ ...f, category_id: e.target.value }))}
                  className="text-xs rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:border-indigo-400">
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={qFilter.difficulty} onChange={e => setQFilter(f => ({ ...f, difficulty: e.target.value }))}
                  className="text-xs rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:border-indigo-400">
                  <option value="">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
                <Button size="sm" onClick={() => navigate('/admin/ai')}>
                  <Sparkles className="w-3.5 h-3.5" /> AI Generate
                </Button>
              </div>
            </div>

            {questionsLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading questions…</div>
            ) : questions.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: 'white', border: '1px solid #e0e7ff' }}>
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-400 mb-4">No questions found. Use AI Generator to create some.</p>
                <Button size="sm" onClick={() => navigate('/admin/ai')}>
                  <Sparkles className="w-4 h-4" /> Open AI Generator
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e0e7ff' }}>
                <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <span className="text-xs text-slate-400">
                    Showing <span className="font-mono font-bold text-slate-600">{questions.length}</span> questions
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e0e7ff' }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Question</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Topic</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Difficulty</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Ans</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider" />
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, i) => (
                      <tr key={q.id} className="hover:bg-slate-50/50 transition-colors"
                        style={{ borderBottom: i < questions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td className="px-4 py-3 max-w-[300px]">
                          <p className="text-slate-700 text-xs leading-relaxed line-clamp-2">{q.content}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {q.topic ? <Badge color="blue">{q.topic}</Badge> : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge color={q.difficulty === 'EASY' ? 'green' : q.difficulty === 'MEDIUM' ? 'yellow' : 'red'}>
                            {q.difficulty}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded" style={{ background: '#dcfce7', color: '#166534' }}>
                            {q.correct_answer?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => deleteQuestion.mutate(q.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-4">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">All Users</h2>
              <Button size="sm" onClick={() => setCreateUserOpen(true)}>
                <UserPlus className="w-4 h-4" /> Create Account
              </Button>
            </div>

            {/* Search + role filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                {USER_ROLE_FILTERS.map(role => (
                  <button
                    key={role}
                    onClick={() => setUserRoleFilter(role)}
                    className="px-3 py-2 text-xs font-medium transition-all flex items-center gap-1.5"
                    style={{
                      background: userRoleFilter === role ? 'var(--qm-navy)' : 'white',
                      color: userRoleFilter === role ? 'white' : '#64748b',
                      borderRight: role !== 'STUDENT' ? '1px solid #e2e8f0' : 'none',
                    }}
                  >
                    {role === 'ALL' ? 'All' : role.charAt(0) + role.slice(1).toLowerCase()}
                    <span className="font-mono text-[10px] opacity-70">({userCountByRole[role]})</span>
                  </button>
                ))}
              </div>
            </div>

            {usersLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-2xl p-10 text-center text-slate-400" style={{ background: 'white', border: '1px solid #e0e7ff' }}>
                {userSearch || userRoleFilter !== 'ALL' ? 'No users match your search.' : 'No users yet.'}
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e0e7ff' }}>
                <div className="px-4 py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <span className="text-xs text-slate-400">
                    <span className="font-mono font-bold text-slate-600">{filteredUsers.length}</span> of {users.length} users
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e0e7ff' }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors"
                        style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{ background: u.role === 'ADMIN' ? '#4338ca' : u.role === 'PROFESSOR' ? '#0e7490' : '#1d4ed8' }}>
                              {u.full_name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <span className="font-medium text-slate-800">{u.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge color={u.role === 'ADMIN' ? 'purple' : u.role === 'PROFESSOR' ? 'blue' : 'green'}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.is_active
                            ? <ToggleRight className="w-6 h-6 text-emerald-500 inline" />
                            : <ToggleLeft className="w-6 h-6 text-slate-300 inline" />}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.role !== 'ADMIN' && u.is_active && (
                            <button
                              onClick={() => { if (confirm(`Deactivate ${u.full_name}?`)) deactivateUser.mutate(u.id) }}
                              title="Deactivate account"
                              className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {examModalOpen && (
          <ExamFormModal
            initial={editingExam}
            categories={categories}
            onClose={() => { setExamModalOpen(false); setEditingExam(null) }}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-exams'] }); setExamModalOpen(false); setEditingExam(null) }}
          />
        )}
        {createUserOpen && (
          <CreateUserModal
            onClose={() => setCreateUserOpen(false)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setCreateUserOpen(false) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
