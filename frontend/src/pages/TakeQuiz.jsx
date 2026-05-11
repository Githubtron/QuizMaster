import { useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Send, AlertTriangle, BookOpen } from 'lucide-react'
import api from '@/services/api'
import { useQuiz } from '@/hooks/useQuiz'
import { QuizTimer } from '@/components/quiz/QuizTimer'
import { QuestionCard } from '@/components/quiz/QuestionCard'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'

export default function TakeQuiz() {
  const { examId: attemptId } = useParams()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const submittingRef = useRef(false)

  const { data: attempt, isLoading: attemptLoading } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () =>
      api.get('/attempts/my').then(r => r.data.find(a => a.id === attemptId)),
    staleTime: Infinity,
  })

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['attempt-questions', attemptId],
    queryFn: () => api.get(`/attempts/${attemptId}/questions`).then(r => r.data),
    staleTime: Infinity,
  })

  const { data: examMeta } = useQuery({
    queryKey: ['exam-meta', attempt?.exam_id],
    queryFn: () => api.get(`/exams/${attempt.exam_id}`).then(r => r.data),
    enabled: !!attempt?.exam_id,
    staleTime: Infinity,
  })

  const quiz = useQuiz(questions)

  const submitMutation = useMutation({
    mutationFn: (answers) => api.post(`/attempts/${attemptId}/submit`, { answers }),
    onSuccess: () => navigate(`/results/${attemptId}`, { replace: true }),
  })

  const handleSubmit = useCallback(() => {
    if (submittingRef.current) return
    submittingRef.current = true
    submitMutation.mutate(quiz.answers)
  }, [quiz.answers, submitMutation])

  const handleTimerExpire = useCallback(() => { handleSubmit() }, [handleSubmit])

  if (attemptLoading || questionsLoading) return <PageSpinner />

  if (!questions.length) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--qm-bg)' }}>
      <div
        className="text-center p-10 rounded-2xl max-w-sm w-full"
        style={{ background: 'white', border: '1px solid #e0e7ff' }}
      >
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-400" />
        <p className="text-slate-600 mb-4">No questions found for this attempt.</p>
        <Button variant="secondary" onClick={() => navigate('/student/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )

  const durationMinutes = examMeta?.duration_minutes ?? 60
  const {
    currentQuestion, currentIndex, totalQuestions, answers, answeredCount,
    isFirst, isLast, selectAnswer, goNext, goPrev,
  } = quiz

  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--qm-bg)' }}>
      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-40"
        style={{
          background: 'var(--qm-navy)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 h-16">
            {/* Exam title + progress text */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {examMeta?.title ?? 'Quiz'}
              </p>
              <p className="text-slate-400 text-xs font-mono mt-0.5">
                {String(answeredCount).padStart(2, '0')}/{String(totalQuestions).padStart(2, '0')} answered
              </p>
            </div>

            {/* Timer — only render once we know the real duration */}
            {examMeta && (
              <div className="flex-shrink-0 scale-75 origin-right">
                <QuizTimer durationMinutes={examMeta.duration_minutes} onExpire={handleTimerExpire} />
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-0.5 bg-white/10 -mx-4 sm:-mx-6">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(to right, #4338ca, #6366f1)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question panel */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl p-6 sm:p-8"
              style={{
                background: 'white',
                border: '1px solid #e0e7ff',
                boxShadow: '0 4px 24px rgba(30,64,175,0.07)',
              }}
            >
              {currentQuestion && (
                <QuestionCard
                  question={currentQuestion}
                  selectedAnswer={answers[currentQuestion.id]}
                  onSelect={selectAnswer}
                  index={currentIndex}
                  total={totalQuestions}
                />
              )}

              {/* Nav buttons */}
              <div
                className="flex items-center justify-between mt-8 pt-6"
                style={{ borderTop: '1px solid #f1f5f9' }}
              >
                <Button
                  variant="outline"
                  onClick={goPrev}
                  disabled={isFirst}
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {isLast ? (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() => setShowConfirm(true)}
                      loading={submitMutation.isPending}
                      size="sm"
                      style={{ background: '#059669', color: 'white' }}
                    >
                      <Send className="h-4 w-4" />
                      Submit Exam
                    </Button>
                  </motion.div>
                ) : (
                  <Button onClick={goNext} variant="primary" size="sm">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar navigator */}
          <div className="lg:col-span-1">
            <div
              className="rounded-2xl p-4 sticky top-24"
              style={{
                background: 'white',
                border: '1px solid #e0e7ff',
                boxShadow: '0 2px 12px rgba(30,64,175,0.06)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Questions
                </p>
              </div>

              <div className="grid grid-cols-5 lg:grid-cols-4 gap-1.5 mb-4">
                {questions.map((q, i) => {
                  const isCurrent  = i === currentIndex
                  const isAnswered = !!answers[q.id]
                  return (
                    <motion.button
                      key={q.id}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => quiz.goTo(i)}
                      className="aspect-square rounded-lg text-[11px] font-mono font-bold transition-all flex items-center justify-center"
                      style={{
                        background: isCurrent
                          ? '#4338ca'
                          : isAnswered
                          ? '#dcfce7'
                          : '#f8fafc',
                        color: isCurrent
                          ? '#fff'
                          : isAnswered
                          ? '#166534'
                          : '#94a3b8',
                        border: isCurrent
                          ? '2px solid #6366f1'
                          : isAnswered
                          ? '1px solid #86efac'
                          : '1px solid #e2e8f0',
                      }}
                    >
                      {i + 1}
                    </motion.button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-1.5">
                {[
                  { bg: '#4338ca', label: 'Current',    text: '#fff' },
                  { bg: '#dcfce7', label: 'Answered',   text: '#166534', border: '#86efac' },
                  { bg: '#f8fafc', label: 'Unanswered', text: '#94a3b8', border: '#e2e8f0' },
                ].map(({ bg, label, text, border }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded"
                      style={{ background: bg, border: border ? `1px solid ${border}` : undefined }}
                    />
                    <span className="text-[11px] text-slate-500">{label}</span>
                  </div>
                ))}
              </div>

              {/* Answer progress bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                  <span>Progress</span>
                  <span className="font-mono font-bold text-slate-600">
                    {answeredCount}/{totalQuestions}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(to right, #4338ca, #6366f1)' }}
                    animate={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm submit modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(10,22,40,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: 'white', boxShadow: '0 24px 64px rgba(10,22,40,0.3)' }}
              onClick={e => e.stopPropagation()}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
              >
                <Send className="w-5 h-5" style={{ color: '#ea580c' }} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg text-center mb-1">Submit your exam?</h3>
              <p className="text-slate-500 text-sm text-center mb-4">
                <span className="font-mono font-bold text-slate-800">{answeredCount}</span> of{' '}
                <span className="font-mono font-bold text-slate-800">{totalQuestions}</span> questions answered
              </p>

              {answeredCount < totalQuestions && (
                <div
                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl mb-4 text-sm"
                  style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800">
                    <span className="font-mono font-bold">{totalQuestions - answeredCount}</span> unanswered{' '}
                    {totalQuestions - answeredCount === 1 ? 'question' : 'questions'} will be marked incorrect.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  loading={submitMutation.isPending}
                  onClick={() => { setShowConfirm(false); handleSubmit() }}
                  style={{ background: '#059669', color: 'white' }}
                >
                  Confirm
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
