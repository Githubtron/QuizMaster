import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Clock, BookOpen, Trophy, ChevronRight, PlayCircle,
  BarChart2, CheckCircle2, AlertCircle, GraduationCap, CalendarClock
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton, SkeletonStatCard, SkeletonCard } from '@/components/ui/Skeleton'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94], delay },
})

function StatCard({ icon: Icon, label, value, accent, bg }) {
  return (
    <motion.div {...fadeUp(0)}>
      <div
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{ background: bg, border: `1px solid ${accent}22` }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: accent + '18' }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
        <div>
          <p className="font-mono text-2xl font-bold" style={{ color: accent }}>{value}</p>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
        </div>
      </div>
    </motion.div>
  )
}

function scheduleStatus(exam) {
  const now = Date.now()
  if (exam.scheduled_start && now < new Date(exam.scheduled_start)) {
    return { locked: true, label: `Opens ${new Date(exam.scheduled_start).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` }
  }
  if (exam.scheduled_end && now > new Date(exam.scheduled_end)) {
    return { locked: true, label: 'Window closed' }
  }
  if (exam.scheduled_end) {
    return { locked: false, label: `Closes ${new Date(exam.scheduled_end).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` }
  }
  return { locked: false, label: null }
}

function ExamCard({ exam, attempt, onStart, delay }) {
  const submitted = attempt?.status === 'SUBMITTED' || attempt?.status === 'TIMED_OUT'
  const inProgress = attempt?.status === 'IN_PROGRESS'
  const { locked, label: scheduleLabel } = scheduleStatus(exam)

  return (
    <motion.div {...fadeUp(delay)}>
      <motion.div
        whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(30,64,175,0.12)' }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-2xl p-5 flex flex-col gap-4 h-full"
        style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 8px rgba(30,64,175,0.06)' }}
      >
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#eef2ff' }}
          >
            <GraduationCap className="w-4 h-4" style={{ color: '#4338ca' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm leading-snug truncate">{exam.title}</h3>
            {exam.description && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{exam.description}</p>
            )}
          </div>
          {submitted && <Badge color="green">Done</Badge>}
          {inProgress && <Badge color="yellow">In Progress</Badge>}
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{exam.duration_minutes}</span> min
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{exam.total_questions}</span> Qs
          </span>
          {scheduleLabel && (
            <span className="flex items-center gap-1.5" style={{ color: locked ? '#dc2626' : '#d97706' }}>
              <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
              {scheduleLabel}
            </span>
          )}
        </div>

        {/* CTA */}
        {submitted ? (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: '#f0fdf4', border: '1px solid #86efac' }}
          >
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-800">
              Score: <span className="font-mono font-bold">{attempt.score?.toFixed(1)}%</span>
            </span>
          </div>
        ) : locked ? (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
          >
            <CalendarClock className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span className="text-xs text-orange-700 font-medium">{scheduleLabel}</span>
          </div>
        ) : (
          <Button
            onClick={() => onStart(exam.id)}
            variant={inProgress ? 'secondary' : 'primary'}
            className="w-full mt-auto"
            size="sm"
          >
            <PlayCircle className="w-4 h-4" />
            {inProgress ? 'Resume Exam' : 'Start Exam'}
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </Button>
        )}
      </motion.div>
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl px-3 py-2 shadow-lg border border-slate-100 text-xs">
      <p className="font-mono font-bold text-slate-800">{payload[0].value.toFixed(1)}%</p>
      <p className="text-slate-400">{payload[0].payload.name}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--qm-bg)' }}>
      <div style={{ background: 'var(--qm-navy)' }} className="h-32" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div>
            <Skeleton className="h-64 rounded-2xl mb-4" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams/').then(r => r.data),
  })

  const { data: myAttempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: () => api.get('/attempts/my').then(r => r.data),
  })

  const isLoading = examsLoading || attemptsLoading

  const attemptByExam = Object.fromEntries(myAttempts.map(a => [a.exam_id, a]))

  const submitted = myAttempts.filter(a => a.status === 'SUBMITTED' || a.status === 'TIMED_OUT')
  const avgScore = submitted.length
    ? (submitted.reduce((s, a) => s + (a.score ?? 0), 0) / submitted.length).toFixed(1)
    : '—'

  const examTitleMap = Object.fromEntries(exams.map(e => [e.id, e.title]))

  const chartData = submitted.slice(0, 8).map((a, i) => ({
    name: examTitleMap[a.exam_id]?.slice(0, 10) ?? `Exam ${i + 1}`,
    score: a.score ?? 0,
  }))

  const handleStart = async (examId) => {
    try {
      const { data: attempt } = await api.post('/attempts/', { exam_id: examId })
      navigate(`/quiz/${attempt.id}`)
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Failed to start exam. Please try again.'
      toast.error(msg)
    }
  }

  if (isLoading) return <DashboardSkeleton />

  const firstName = user.full_name?.split(' ')[0] ?? 'Student'

  return (
    <div className="min-h-screen" style={{ background: 'var(--qm-bg)' }}>
      {/* Hero greeting */}
      <div style={{ background: 'var(--qm-navy)' }} className="relative overflow-hidden">
        {/* subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div {...fadeUp(0)}>
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-[0.2em] mb-2">
              Student Portal
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              Welcome back, {firstName}
            </h1>
            <p className="text-slate-400 text-sm">
              {exams.length - submitted.length > 0
                ? `You have ${exams.length - submitted.length} pending exam${exams.length - submitted.length > 1 ? 's' : ''}`
                : 'All exams completed — great work!'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={BookOpen}    label="Available"  value={exams.length}                   accent="#1d4ed8" bg="white" />
          <StatCard icon={CheckCircle2} label="Completed" value={submitted.length}                accent="#059669" bg="white" />
          <StatCard icon={Trophy}       label="Avg Score"  value={avgScore === '—' ? '—' : `${avgScore}%`} accent="#7c3aed" bg="white" />
          <StatCard icon={AlertCircle}  label="Pending"    value={exams.length - submitted.length} accent="#d97706" bg="white" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Exam list */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Available Exams</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                {exams.length}
              </span>
            </div>

            {exams.length === 0 ? (
              <div
                className="rounded-2xl p-12 text-center"
                style={{ background: 'white', border: '1px solid #e0e7ff' }}
              >
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-400 text-sm">No exams available right now</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {exams.map((exam, i) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    attempt={attemptByExam[exam.id]}
                    onStart={handleStart}
                    delay={i * 0.06}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            {/* Score chart */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Score History</h2>
              </div>
              {chartData.length === 0 ? (
                <div
                  className="rounded-2xl p-8 text-center"
                  style={{ background: 'white', border: '1px solid #e0e7ff' }}
                >
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs text-slate-400">Complete exams to see scores</p>
                </div>
              ) : (
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'white', border: '1px solid #e0e7ff' }}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'Space Mono, monospace' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#eef2ff' }} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={32}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.score >= 60 ? '#059669' : '#ef4444'} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Recent results */}
            {submitted.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Recent Results</h2>
                <div className="flex flex-col gap-2">
                  {submitted.slice(0, 5).map((attempt, i) => (
                    <motion.div
                      key={attempt.id}
                      {...fadeUp(i * 0.05)}
                      onClick={() => navigate(`/results/${attempt.id}`)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: 'white',
                        border: '1px solid #e0e7ff',
                      }}
                      whileHover={{ x: 3 }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: attempt.score >= 60 ? '#059669' : '#dc2626' }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {examTitleMap[attempt.exam_id] ?? 'Exam'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(attempt.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-sm font-bold"
                          style={{ color: attempt.score >= 60 ? '#059669' : '#dc2626' }}
                        >
                          {attempt.score?.toFixed(1)}%
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
