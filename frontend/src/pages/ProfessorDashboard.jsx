import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  LayoutDashboard, FileText, BookOpen, Users, Plus, Trash2, Zap,
  CheckCircle2, BarChart2, ToggleLeft, ToggleRight, X, Sparkles,
  Pencil, Download, GraduationCap, AlertCircle, TrendingUp, Award, RefreshCw,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { PageSpinner } from '@/components/ui/Spinner'

// ── Zod schema ─────────────────────────────────────────────────────────────────
const examSchema = z.object({
  title:            z.string().min(1, 'Title is required').max(255),
  description:      z.string().optional(),
  category_id:      z.string().min(1, 'Category is required'),
  duration_minutes: z.coerce.number().int().min(1).max(480),
  total_questions:  z.coerce.number().int().min(1).max(200),
  num_sets:         z.coerce.number().int().min(1).max(26),
  scheduled_start:  z.string().optional().nullable(),
  scheduled_end:    z.string().optional().nullable(),
})

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

// ── Inline alert ───────────────────────────────────────────────────────────────
function InlineAlert({ message, onDismiss }) {
  if (!message) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
      style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' }}
    >
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="hover:opacity-70 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
}

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
          <Input label="Title" {...register('title')} error={errors.title?.message} placeholder="e.g. Mid-Semester 2024" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea {...register('description')} rows={2} placeholder="Brief overview..." className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none resize-none" />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Opens at <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="datetime-local" {...register('scheduled_start')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none bg-white" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Closes at <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="datetime-local" {...register('scheduled_end')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none bg-white" />
            </div>
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

// ── Tabs ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview',   icon: LayoutDashboard },
  { id: 'exams',     label: 'My Exams',   icon: FileText },
  { id: 'questions', label: 'Questions',  icon: BookOpen },
  { id: 'results',   label: 'Results',    icon: Users },
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

// ── Score bar cell ─────────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const pct = score ?? 0
  const color = pct >= 60 ? '#059669' : '#ef4444'
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" style={{ minWidth: 56 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs font-bold w-10 text-right" style={{ color }}>{pct.toFixed(1)}%</span>
    </div>
  )
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, color = '#4338ca' }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
      style={{ background: color }}>
      {initials}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ProfessorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()

  const [activeTab, setActiveTab]                   = useState('overview')
  const [examModalOpen, setExamModalOpen]           = useState(false)
  const [editingExam, setEditingExam]               = useState(null)
  const [deletingExamId, setDeletingExamId]         = useState(null)
  const [generatingId, setGeneratingId]             = useState(null)
  const [downloadingId, setDownloadingId]           = useState(null)
  const [downloadingOverall, setDownloadingOverall] = useState(false)
  const [qFilter, setQFilter]                       = useState({ category_id: '', difficulty: '' })
  const [selectedExamForResults, setSelectedExamForResults] = useState(null)

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['prof-exams'],
    queryFn: () => api.get('/exams/').then(r => r.data),
    staleTime: 0,
    refetchInterval: 30_000,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories/').then(r => r.data),
  })

  const { data: analytics } = useQuery({
    queryKey: ['prof-analytics'],
    queryFn: () => api.get('/analytics/professor').then(r => r.data),
    enabled: activeTab === 'overview',
    staleTime: 0,
    refetchInterval: 10_000,
  })

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['prof-questions', qFilter],
    queryFn: () => {
      const p = new URLSearchParams()
      if (qFilter.category_id) p.set('category_id', qFilter.category_id)
      if (qFilter.difficulty)  p.set('difficulty', qFilter.difficulty)
      return api.get(`/questions/?${p}`).then(r => r.data)
    },
    enabled: activeTab === 'questions',
  })

  const { data: examResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['exam-results', selectedExamForResults],
    queryFn: () => api.get(`/attempts/exam/${selectedExamForResults}`).then(r => r.data),
    enabled: !!selectedExamForResults && activeTab === 'results',
    staleTime: 0,
    refetchInterval: 10_000,
  })

  const deleteExam = useMutation({
    mutationFn: id => api.delete(`/exams/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prof-exams'] }); setDeletingExamId(null) },
  })

  const toggleExam = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/exams/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prof-exams'] }),
  })

  const deleteQuestion = useMutation({
    mutationFn: id => api.delete(`/questions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prof-questions'] }),
  })

  const handleGenerateSets = async (examId) => {
    setGeneratingId(examId)
    try {
      await api.post(`/sets/${examId}/generate`)
      qc.invalidateQueries({ queryKey: ['prof-exams'] })
      toast.success('Paper sets generated successfully')
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Failed to generate sets')
    } finally {
      setGeneratingId(null)
    }
  }

  const handleExamReportDownload = async (examId) => {
    setDownloadingId(examId)
    try {
      await handleDownload(`/reports/exam/${examId}`, `exam_report_${examId.slice(0,8)}.pdf`)
      toast.success('Report downloaded')
    } catch {
      toast.error('Failed to download exam report. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleOverallDownload = async () => {
    setDownloadingOverall(true)
    try {
      await handleDownload('/reports/professor/overall', 'professor_overall_report.pdf')
      toast.success('Overall report downloaded')
    } catch {
      toast.error('Failed to download report. Please try again.')
    } finally {
      setDownloadingOverall(false)
    }
  }

  const catMap    = Object.fromEntries(categories.map(c => [c.id, c.name]))
  const firstName = user?.full_name?.split(' ')[0] ?? 'Professor'

  const barChartData = analytics?.exam_stats?.slice(0, 8).map(e => ({
    name: e.exam_title.slice(0, 14),
    score: e.avg_score ?? 0,
    attempts: e.attempts,
  })) ?? []

  const submitted   = examResults.filter(a => a.status === 'SUBMITTED' || a.status === 'TIMED_OUT')
  const avgScore    = submitted.length ? (submitted.reduce((s, a) => s + (a.score ?? 0), 0) / submitted.length) : 0
  const passCount   = submitted.filter(a => (a.score ?? 0) >= 60).length
  const passRate    = submitted.length ? (passCount / submitted.length * 100) : 0

  // Sort submitted by score desc for ranking
  const sortedResults = [...examResults].sort((a, b) => {
    const sa = a.score ?? -1, sb = b.score ?? -1
    return sb - sa
  })

  // Score distribution buckets [0-20, 20-40, 40-60, 60-80, 80-100]
  const buckets = [
    { name: '0–20', range: [0, 20],  color: '#ef4444' },
    { name: '21–40', range: [21, 40], color: '#f97316' },
    { name: '41–60', range: [41, 60], color: '#eab308' },
    { name: '61–80', range: [61, 80], color: '#22c55e' },
    { name: '81–100', range: [81, 100], color: '#059669' },
  ]
  const distData = buckets.map(b => ({
    name: b.name,
    count: submitted.filter(a => (a.score ?? 0) >= b.range[0] && (a.score ?? 0) <= b.range[1]).length,
    color: b.color,
  }))

  // Overview donut — pass vs fail
  const donutData = analytics
    ? [
        { name: 'Pass (≥60%)', value: analytics.exam_stats?.reduce((s, e) => s + Math.round(e.attempts * (e.pass_rate ?? 0) / 100), 0) ?? 0, color: '#059669' },
        { name: 'Fail (<60%)', value: analytics.exam_stats?.reduce((s, e) => s + e.attempts - Math.round(e.attempts * (e.pass_rate ?? 0) / 100), 0) ?? 0, color: '#ef4444' },
      ]
    : []

  const AVATAR_COLORS = ['#4338ca', '#0e7490', '#7c3aed', '#b45309', '#be123c', '#15803d']

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
                <p className="text-xs font-mono text-indigo-400 uppercase tracking-[0.2em] mb-2">Professor Portal</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Welcome, {firstName}</h1>
                <p className="text-slate-400 text-sm mb-6">Manage your exams, questions, and student results</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleOverallDownload} loading={downloadingOverall}
                className="border-white/20 text-white hover:bg-white/10 hidden sm:flex">
                <Download className="w-4 h-4" />
                Overall Report
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'My Exams',      value: exams.length,                                                        accent: '#1d4ed8', icon: FileText },
                { label: 'Total Attempts', value: analytics?.total_attempts ?? '—',                                   accent: '#7c3aed', icon: BarChart2 },
                { label: 'Avg Score',      value: analytics?.avg_score != null ? `${analytics.avg_score}%` : '—',     accent: '#059669', icon: CheckCircle2 },
                { label: 'Active Exams',   value: exams.filter(e => e.is_active).length,                              accent: '#d97706', icon: GraduationCap },
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

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Avg Scores bar chart */}
              {barChartData.length > 0 && (
                <div className="lg:col-span-2 bg-white rounded-2xl p-6" style={{ border: '1px solid #e0e7ff' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Exam Average Scores</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={barChartData} margin={{ top: 4, right: 4, left: -24, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#eef2ff' }} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={36}>
                        {barChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.score >= 60 ? '#059669' : '#ef4444'} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pass / Fail donut */}
              {donutData.some(d => d.value > 0) && (
                <div className="bg-white rounded-2xl p-6 flex flex-col" style={{ border: '1px solid #e0e7ff' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Pass / Fail Split</h2>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={74}
                          dataKey="value" paddingAngle={3}>
                          {donutData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [v, 'Attempts']} />
                        <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MY EXAMS ── */}
        {activeTab === 'exams' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                My Exams <span className="font-mono text-indigo-600 ml-2">({exams.length})</span>
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
                      {['Title', 'Category', "Q's", 'Sets', 'Active', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam, i) => (
                      <tr key={exam.id} className="group" style={{ borderBottom: i < exams.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 truncate max-w-[200px]">{exam.title}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{exam.duration_minutes} min</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
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
                            <button onClick={() => handleExamReportDownload(exam.id)} disabled={downloadingId === exam.id}
                              title="Download exam report" className="p-2 rounded-lg hover:bg-green-50 text-slate-300 hover:text-green-500 transition-colors disabled:opacity-40">
                              {downloadingId === exam.id ? <span className="text-xs font-mono text-green-400">…</span> : <Download className="w-4 h-4" />}
                            </button>
                            <button onClick={() => { setEditingExam(exam); setExamModalOpen(true) }} title="Edit exam"
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {deletingExamId === exam.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <button onClick={() => deleteExam.mutate(exam.id)} className="px-2 py-1 rounded-md text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">Confirm</button>
                                <button onClick={() => setDeletingExamId(null)} className="px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
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
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">My Question Bank</h2>
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
                <Button size="sm" onClick={() => navigate('/professor/ai')}>
                  <Sparkles className="w-3.5 h-3.5" /> AI Generate
                </Button>
              </div>
            </div>

            {questionsLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading questions…</div>
            ) : questions.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: 'white', border: '1px solid #e0e7ff' }}>
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-400 mb-4">No questions yet. Use AI Generator to create some.</p>
                <Button size="sm" onClick={() => navigate('/professor/ai')}>
                  <Sparkles className="w-4 h-4" /> Open AI Generator
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e0e7ff' }}>
                <div className="px-4 py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <span className="text-xs text-slate-400">
                    <span className="font-mono font-bold text-slate-600">{questions.length}</span> questions
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e0e7ff' }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Question</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Topic</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Difficulty</th>
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

        {/* ── RESULTS ── */}
        {activeTab === 'results' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Student Results</h2>
              <select
                value={selectedExamForResults ?? ''}
                onChange={e => setSelectedExamForResults(e.target.value || null)}
                className="text-xs rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:border-indigo-400"
              >
                <option value="">Select an exam…</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
              {selectedExamForResults && (
                <button
                  onClick={() => qc.invalidateQueries({ queryKey: ['exam-results', selectedExamForResults] })}
                  title="Refresh results"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!selectedExamForResults ? (
              <div className="rounded-2xl p-12 text-center text-slate-400" style={{ background: 'white', border: '1px solid #e0e7ff' }}>
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Select an exam above to view student results.</p>
              </div>
            ) : resultsLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading results…</div>
            ) : examResults.length === 0 ? (
              <div className="rounded-2xl p-10 text-center text-slate-400" style={{ background: 'white', border: '1px solid #e0e7ff' }}>
                No attempts yet for this exam.
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Attempts', value: examResults.length,          accent: '#6366f1' },
                    { label: 'Submitted',       value: submitted.length,            accent: '#0891b2' },
                    { label: 'Average Score',   value: `${avgScore.toFixed(1)}%`,   accent: '#7c3aed' },
                    { label: 'Pass Rate',        value: `${passRate.toFixed(1)}%`,  accent: passRate >= 60 ? '#059669' : '#dc2626' },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="bg-white rounded-2xl px-4 py-3 flex flex-col gap-1"
                      style={{ border: `1px solid ${accent}22`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <p className="font-mono text-xl font-bold" style={{ color: accent }}>{value}</p>
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Score distribution */}
                {submitted.length > 0 && (
                  <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e0e7ff' }}>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Score Distribution</h3>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={distData} margin={{ top: 2, right: 4, left: -28, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v) => [v, 'Students']} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {distData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Results table */}
                <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e0e7ff' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e0e7ff' }}>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Set</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedResults.map((a, i) => {
                        const isTop3 = i < 3 && (a.score ?? 0) > 0
                        const rankColors = ['#d97706', '#64748b', '#b45309']
                        return (
                          <tr key={a.id} className="hover:bg-slate-50/40 transition-colors"
                            style={{ borderBottom: i < sortedResults.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <td className="px-4 py-3 text-center">
                              {isTop3 ? (
                                <span className="text-base" title={['Gold', 'Silver', 'Bronze'][i]}>
                                  {['🥇', '🥈', '🥉'][i]}
                                </span>
                              ) : (
                                <span className="font-mono text-xs text-slate-400">{i + 1}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar
                                  name={a.student_name ?? '?'}
                                  color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                                />
                                <span className="text-slate-700 text-xs font-medium">
                                  {a.student_name ?? `Student ···${a.student_id.slice(-6)}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              {a.set_label
                                ? <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md" style={{ background: '#e0e7ff', color: '#4338ca' }}>Set {a.set_label}</span>
                                : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 w-40">
                              {a.score != null ? <ScoreBar score={a.score} /> : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <Badge color={a.status === 'SUBMITTED' ? 'green' : a.status === 'TIMED_OUT' ? 'yellow' : 'slate'}>
                                {a.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">
                              {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
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
            onSaved={() => { qc.invalidateQueries({ queryKey: ['prof-exams'] }); setExamModalOpen(false); setEditingExam(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
