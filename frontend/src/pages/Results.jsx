import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, Home, Clock, CheckCircle2, XCircle, MinusCircle, Award, Download } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import api from '@/services/api'
import { useToast } from '@/hooks/useToast'
import { ResultCard } from '@/components/quiz/ResultCard'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'

function ScoreRing({ score }) {
  const color = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626'
  const track = score >= 80 ? '#dcfce7' : score >= 50 ? '#fef3c7' : '#fee2e2'
  const data = [
    { value: score },
    { value: Math.max(0, 100 - score) },
  ]
  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={62}
            outerRadius={80}
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            <Cell fill={color} />
            <Cell fill={track} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold leading-none" style={{ color }}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-slate-400 font-mono mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94], delay },
})

async function downloadResultPdf(attemptId) {
  const response = await api.get(`/reports/student/${attemptId}`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `result_${attemptId.slice(0, 8)}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default function Results() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [downloading, setDownloading] = useState(false)

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['result', attemptId],
    queryFn: () => api.get(`/attempts/${attemptId}/result`).then(r => r.data),
    staleTime: Infinity,
  })

  if (isLoading) return <PageSpinner />

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--qm-bg)' }}>
      <div
        className="p-8 text-center rounded-2xl max-w-sm w-full"
        style={{ background: 'white', border: '1px solid #fee2e2' }}
      >
        <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-slate-600 mb-4">Could not load results.</p>
        <Button onClick={() => navigate('/student/dashboard')}>Go to Dashboard</Button>
      </div>
    </div>
  )

  const { score, correct_count, total_questions, exam_title, set_label, duration_seconds, questions } = result
  const wrong_count = total_questions - correct_count
  const skipped_count = questions?.filter(q => q.student_answer === null || q.student_answer === undefined).length ?? 0
  const passed = score >= 60

  const durationStr = duration_seconds != null
    ? `${Math.floor(duration_seconds / 60)}m ${duration_seconds % 60}s`
    : '—'

  const scoreColor = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626'
  const heroAccent = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626'

  return (
    <div className="min-h-screen" style={{ background: 'var(--qm-bg)' }}>
      {/* Hero header */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'var(--qm-navy)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Accent bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: heroAccent }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div {...fadeUp(0)} className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-[0.2em]">
              Exam Results
            </p>
          </motion.div>
          <motion.h1 {...fadeUp(0.05)} className="text-2xl sm:text-3xl font-bold text-white mb-1">
            {exam_title}
          </motion.h1>
          <motion.p {...fadeUp(0.1)} className="text-slate-400 text-sm font-mono">
            Set {set_label}
          </motion.p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Result hero card */}
        <motion.div {...fadeUp(0.1)} className="mb-8">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'white',
              border: '1px solid #e0e7ff',
              boxShadow: '0 8px 32px rgba(30,64,175,0.08)',
            }}
          >
            {/* Score banner */}
            <div
              className="px-6 py-4 flex items-center gap-3"
              style={{ background: scoreColor + '10', borderBottom: `1px solid ${scoreColor}20` }}
            >
              <Trophy className="w-5 h-5 flex-shrink-0" style={{ color: scoreColor }} />
              <span className="font-bold text-lg" style={{ color: scoreColor }}>
                {passed ? 'Passed' : 'Not Passed'}
              </span>
              {passed && (
                <span
                  className="ml-auto text-xs font-mono font-bold px-2.5 py-1 rounded-full"
                  style={{ background: scoreColor + '18', color: scoreColor }}
                >
                  PASS
                </span>
              )}
              {!passed && (
                <span
                  className="ml-auto text-xs font-mono font-bold px-2.5 py-1 rounded-full"
                  style={{ background: '#fee2e2', color: '#dc2626' }}
                >
                  FAIL
                </span>
              )}
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                {/* Score ring */}
                <div className="flex-shrink-0">
                  <ScoreRing score={score} />
                </div>

                {/* Stats grid */}
                <div className="flex-1 w-full">
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {/* Correct */}
                    <div
                      className="rounded-xl p-4 text-center"
                      style={{ background: '#f0fdf4', border: '1px solid #86efac' }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-2" />
                      <p className="font-mono text-2xl font-bold text-green-700">{correct_count}</p>
                      <p className="text-xs text-green-600 font-medium mt-0.5">Correct</p>
                    </div>
                    {/* Wrong */}
                    <div
                      className="rounded-xl p-4 text-center"
                      style={{ background: '#fff5f5', border: '1px solid #fca5a5' }}
                    >
                      <XCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
                      <p className="font-mono text-2xl font-bold text-red-600">{wrong_count}</p>
                      <p className="text-xs text-red-500 font-medium mt-0.5">Wrong</p>
                    </div>
                    {/* Time */}
                    <div
                      className="rounded-xl p-4 text-center"
                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    >
                      <Clock className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                      <p className="font-mono text-xl font-bold text-slate-700 leading-tight">{durationStr}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Time taken</p>
                    </div>
                  </div>

                  {/* Skipped note */}
                  {skipped_count > 0 && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-xs"
                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    >
                      <MinusCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500">
                        <span className="font-mono font-bold text-slate-700">{skipped_count}</span>{' '}
                        question{skipped_count > 1 ? 's' : ''} not attempted
                      </span>
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    <Button variant="outline" onClick={() => navigate('/student/dashboard')} size="sm">
                      <Home className="h-4 w-4" />
                      Back to Dashboard
                    </Button>
                    <Button
                      size="sm"
                      loading={downloading}
                      onClick={async () => {
                        setDownloading(true)
                        try {
                          await downloadResultPdf(attemptId)
                          toast.success('PDF downloaded successfully')
                        } catch {
                          toast.error('Failed to download PDF. Please try again.')
                        } finally {
                          setDownloading(false)
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Download Result PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Question breakdown */}
        <motion.div {...fadeUp(0.2)}>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Question Breakdown
            </h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
              {questions?.length ?? 0}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {questions?.map((q, i) => (
              <ResultCard key={q.id} question={q} index={i} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
