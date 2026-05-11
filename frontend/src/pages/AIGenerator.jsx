import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Sparkles, Upload, FileText, CheckCircle2, AlertTriangle,
  ChevronLeft, BookOpen, Zap, Send, Clock, Layers,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const genSchema = z.object({
  category_id:   z.string().min(1, 'Select a category'),
  num_questions: z.coerce.number().int().min(1).max(50),
  file:          z.any().refine(f => f?.[0]?.name?.toLowerCase().endsWith('.pdf'), {
    message: 'Must be a PDF file',
  }),
})

const diffColor = { EASY: 'green', MEDIUM: 'yellow', HARD: 'red' }

export default function AIGenerator() {
  const navigate   = useNavigate()
  const { isAdmin } = useAuth()
  const dashRoute  = isAdmin ? '/admin' : '/professor'
  const fileRef    = useRef(null)

  const [dragOver,      setDragOver]      = useState(false)
  const [fileName,      setFileName]      = useState(null)
  const [generated,     setGenerated]     = useState(null)   // list of questions
  const [publishedExam, setPublishedExam] = useState(null)   // exam after publishing

  // Publish form
  const [examTitle,    setExamTitle]    = useState('')
  const [examDesc,     setExamDesc]     = useState('')
  const [duration,     setDuration]     = useState(60)
  const [perSet,       setPerSet]       = useState(10)
  const [numSets,      setNumSets]      = useState(1)
  const [isActive,     setIsActive]     = useState(true)
  const [publishError, setPublishError] = useState(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories/').then(r => r.data),
  })

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(genSchema),
    defaultValues: { num_questions: 10 },
  })

  const numQuestions = watch('num_questions') || 10
  const categoryId   = watch('category_id')

  const generateMutation = useMutation({
    mutationFn: (fd) =>
      api.post('/ai/generate', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(r => r.data),
    onSuccess: (data) => {
      setGenerated(data)
      setPerSet(Math.min(data.length, 10))
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      const { data: exam } = await api.post('/exams/', {
        title:            examTitle.trim(),
        description:      examDesc.trim() || null,
        category_id:      categoryId,
        duration_minutes: Number(duration),
        total_questions:  Number(perSet),
        num_sets:         Number(numSets),
        is_active:        isActive,
      })
      await api.post(`/sets/${exam.id}/generate`)
      return exam
    },
    onSuccess: (exam) => {
      setPublishedExam(exam)
      setPublishError(null)
    },
    onError: (err) => {
      setPublishError(
        err.response?.data?.detail ?? 'Failed to publish exam. Please try again.'
      )
    },
  })

  const handlePublish = (e) => {
    e.preventDefault()
    if (!examTitle.trim()) { setPublishError('Exam title is required.'); return }
    setPublishError(null)
    publishMutation.mutate()
  }

  const resetAll = () => {
    setGenerated(null)
    setPublishedExam(null)
    setExamTitle('')
    setExamDesc('')
    setDuration(60)
    setPerSet(10)
    setNumSets(1)
    setIsActive(true)
    setPublishError(null)
  }

  const onSubmit = (data) => {
    const fd = new FormData()
    fd.append('file', data.file[0])
    fd.append('category_id', data.category_id)
    fd.append('num_questions', String(data.num_questions))
    generateMutation.mutate(fd)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    setFileName(file.name)
    const dt = new DataTransfer()
    dt.items.add(file)
    setValue('file', dt.files, { shouldValidate: true })
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setValue('file', e.target.files, { shouldValidate: true })
  }

  const needCount = Number(perSet) * Number(numSets)

  return (
    <div className="min-h-screen" style={{ background: 'var(--qm-bg)' }}>
      {/* ── Header ── */}
      <div style={{ background: 'var(--qm-navy)' }} className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <button
            onClick={() => navigate(dashRoute)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs mb-6 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                <Sparkles className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <p className="text-xs font-mono text-indigo-400 uppercase tracking-[0.2em]">
                  {isAdmin ? 'Admin Tool' : 'Professor Tool'}
                </p>
                <h1 className="text-2xl font-bold text-white">AI Question Generator</h1>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              Upload a PDF — AI extracts exam-quality MCQs, then publish them as an exam instantly.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">

          {/* ── PUBLISHED SUCCESS ── */}
          {publishedExam ? (
            <motion.div
              key="published"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Exam Published!</h2>
              <p className="text-slate-500 text-sm mb-6">
                {publishedExam.is_active
                  ? 'Your exam is live and available to students.'
                  : 'Your exam is saved as inactive — activate it from your dashboard when ready.'}
              </p>

              <div
                className="bg-white rounded-2xl p-5 text-left mb-6 max-w-sm mx-auto"
                style={{ border: '1px solid #e0e7ff' }}
              >
                <p className="font-semibold text-slate-800 mb-3 truncate">{publishedExam.title}</p>
                <div className="space-y-2 text-sm">
                  {[
                    ['Questions / set', publishedExam.total_questions],
                    ['Paper sets',      publishedExam.num_sets],
                    ['Duration',        `${publishedExam.duration_minutes} min`],
                    ['Status',          publishedExam.is_active ? 'Active' : 'Inactive'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-400">{label}</span>
                      <span
                        className={`font-semibold font-mono ${
                          label === 'Status'
                            ? publishedExam.is_active ? 'text-green-600' : 'text-slate-400'
                            : 'text-slate-700'
                        }`}
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate(`${dashRoute}?tab=exams`)}>
                  <BookOpen className="w-4 h-4" /> View in Dashboard
                </Button>
                <Button onClick={resetAll}>
                  <Sparkles className="w-4 h-4" /> Generate Another
                </Button>
              </div>
            </motion.div>

          /* ── RESULTS + PUBLISH FORM ── */
          ) : generated ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Success banner */}
              <div
                className="rounded-2xl p-5 mb-6 flex items-center gap-4"
                style={{ background: '#f0fdf4', border: '1px solid #86efac' }}
              >
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-green-800">
                    <span className="font-mono">{generated.length}</span> questions generated and saved!
                  </p>
                  <p className="text-green-600 text-xs mt-0.5">
                    Review the questions below, then publish as an exam.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setGenerated(null); setPublishError(null) }}
                  style={{ borderColor: '#86efac', color: '#166534' }}
                >
                  Generate more
                </Button>
              </div>

              {/* Questions table */}
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
                Generated Questions
              </h2>
              <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid #e0e7ff' }}>
                {generated.map((q, i) => (
                  <div
                    key={q.id}
                    className="px-5 py-4"
                    style={{ borderBottom: i < generated.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
                        style={{ background: '#eef2ff', color: '#4338ca' }}
                      >
                        Q{String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 mb-2 leading-relaxed">{q.content}</p>
                        <div className="grid grid-cols-2 gap-1 mb-3">
                          {['option_a', 'option_b', 'option_c', 'option_d'].map((key, oi) => {
                            const letter    = ['a', 'b', 'c', 'd'][oi]
                            const isCorrect = q.correct_answer === letter
                            return (
                              <div
                                key={key}
                                className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg"
                                style={{
                                  background: isCorrect ? '#dcfce7' : '#f8fafc',
                                  border: `1px solid ${isCorrect ? '#86efac' : '#e2e8f0'}`,
                                }}
                              >
                                <span
                                  className="font-mono font-bold w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0"
                                  style={{
                                    background: isCorrect ? '#16a34a' : '#e2e8f0',
                                    color:      isCorrect ? '#fff'    : '#94a3b8',
                                  }}
                                >
                                  {letter.toUpperCase()}
                                </span>
                                <span style={{ color: isCorrect ? '#166534' : '#475569' }}>{q[key]}</span>
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          {q.topic   && <Badge color="blue">{q.topic}</Badge>}
                          <Badge color={diffColor[q.difficulty] ?? 'slate'}>{q.difficulty}</Badge>
                          {q.chapter && <span className="text-xs text-slate-400">{q.chapter}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── PUBLISH AS EXAM ── */}
              <div
                className="bg-white rounded-2xl p-6 mb-6"
                style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 12px rgba(30,64,175,0.06)' }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#eef2ff' }}>
                    <Send className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h2 className="font-semibold text-slate-800">Publish as Exam</h2>
                </div>

                {publishError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-3 mb-4 flex items-start gap-2"
                    style={{ background: '#fff5f5', border: '1px solid #fca5a5' }}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{publishError}</p>
                  </motion.div>
                )}

                <form onSubmit={handlePublish} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      Exam Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={examTitle}
                      onChange={e => setExamTitle(e.target.value)}
                      placeholder="e.g. Midterm Exam – Computer Networks"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      Description <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={examDesc}
                      onChange={e => setExamDesc(e.target.value)}
                      placeholder="Brief instructions for students…"
                      rows={2}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Duration / Questions per set / Num sets */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1.5">
                        <Clock className="w-3.5 h-3.5" /> Duration (min)
                      </label>
                      <input
                        type="number"
                        min={1} max={480}
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">
                        Questions / Set
                      </label>
                      <input
                        type="number"
                        min={1} max={50}
                        value={perSet}
                        onChange={e => setPerSet(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1.5">
                        <Layers className="w-3.5 h-3.5" /> Paper Sets
                      </label>
                      <input
                        type="number"
                        min={1} max={26}
                        value={numSets}
                        onChange={e => setNumSets(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Needs-count hint */}
                  <p className={`text-xs ${needCount > generated.length ? 'text-amber-600' : 'text-slate-400'}`}>
                    {numSets} set{numSets > 1 ? 's' : ''} × {perSet} questions = {needCount} needed
                    {needCount > generated.length
                      ? ` — only ${generated.length} just generated; existing questions in this category will also be used`
                      : ` — ${generated.length} available from this session`}
                  </p>

                  {/* Active toggle */}
                  <div
                    className="flex items-center justify-between py-3 px-4 rounded-xl"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">Publish immediately</p>
                      <p className="text-xs text-slate-400">Make this exam visible to students right away</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsActive(v => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                        isActive ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={publishMutation.isPending}
                  >
                    {publishMutation.isPending ? (
                      <>Creating exam and generating paper sets…</>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Publish Exam
                      </>
                    )}
                  </Button>
                </form>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate(`${dashRoute}?tab=questions`)}>
                  <BookOpen className="w-4 h-4" /> View Question Bank
                </Button>
                <Button onClick={() => { setGenerated(null); setPublishError(null) }}>
                  <Sparkles className="w-4 h-4" /> Generate More
                </Button>
              </div>
            </motion.div>

          /* ── GENERATE FORM ── */
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {generateMutation.isError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4 mb-6 flex items-start gap-3"
                  style={{ background: '#fff5f5', border: '1px solid #fca5a5' }}
                >
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Generation failed</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {generateMutation.error?.response?.data?.detail ?? 'Check your API keys and try again.'}
                    </p>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                {/* Config card */}
                <div
                  className="bg-white rounded-2xl p-6"
                  style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 12px rgba(30,64,175,0.06)' }}
                >
                  <h2 className="font-semibold text-slate-800 mb-5">Configuration</h2>

                  <div className="flex flex-col gap-1.5 mb-5">
                    <label className="text-sm font-medium text-slate-700">Subject Category</label>
                    <select
                      {...register('category_id')}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">Choose a category…</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {errors.category_id && (
                      <p className="text-xs text-red-500">{errors.category_id.message}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Number of Questions</label>
                      <span
                        className="font-mono font-bold text-lg px-3 py-0.5 rounded-lg"
                        style={{ background: '#eef2ff', color: '#4338ca' }}
                      >
                        {numQuestions}
                      </span>
                    </div>
                    <input
                      type="range" min={1} max={50}
                      {...register('num_questions')}
                      className="w-full accent-indigo-600 h-2 rounded-full"
                    />
                    <div className="flex justify-between text-xs text-slate-400 font-mono">
                      <span>1</span><span>25</span><span>50</span>
                    </div>
                  </div>
                </div>

                {/* File drop zone */}
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 12px rgba(30,64,175,0.06)' }}
                >
                  <div className="bg-white p-6">
                    <h2 className="font-semibold text-slate-800 mb-5">Upload PDF</h2>
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                      className="cursor-pointer rounded-xl transition-all duration-200 flex flex-col items-center justify-center py-12 px-6 text-center"
                      style={{
                        border:     `2px dashed ${dragOver ? '#6366f1' : fileName ? '#86efac' : '#cbd5e1'}`,
                        background: dragOver ? '#eef2ff' : fileName ? '#f0fdf4' : '#f8fafc',
                      }}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      {fileName ? (
                        <>
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: '#dcfce7' }}>
                            <FileText className="w-6 h-6 text-green-600" />
                          </div>
                          <p className="font-semibold text-green-800 text-sm">{fileName}</p>
                          <p className="text-green-600 text-xs mt-1">Click to change file</p>
                        </>
                      ) : (
                        <>
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all"
                            style={{ background: dragOver ? '#eef2ff' : '#f1f5f9' }}
                          >
                            <Upload className="w-6 h-6" style={{ color: dragOver ? '#4338ca' : '#94a3b8' }} />
                          </div>
                          <p className="font-semibold text-slate-700 text-sm mb-1">Drop your PDF here</p>
                          <p className="text-slate-400 text-xs">or click to browse — max 10 MB</p>
                        </>
                      )}
                    </div>
                    {errors.file && (
                      <p className="text-xs text-red-500 mt-2">{errors.file.message}</p>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>Analysing PDF and generating questions…</>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Generate {numQuestions} Question{numQuestions > 1 ? 's' : ''} with AI
                      </>
                    )}
                  </Button>
                </motion.div>

                {generateMutation.isPending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-2xl p-4 text-center"
                    style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}
                  >
                    <p className="text-indigo-700 text-sm font-medium">
                      AI is reading your PDF and crafting questions…
                    </p>
                    <p className="text-indigo-400 text-xs mt-1">This may take 15–60 seconds.</p>
                  </motion.div>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
