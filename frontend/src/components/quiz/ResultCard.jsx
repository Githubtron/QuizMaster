import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

const KEYS  = { a: 'option_a', b: 'option_b', c: 'option_c', d: 'option_d' }
const LABELS = { a: 'A', b: 'B', c: 'C', d: 'D' }
const diffColor = { EASY: 'green', MEDIUM: 'yellow', HARD: 'red' }

export function ResultCard({ question, index }) {
  const { is_correct, student_answer, correct_answer } = question
  const skipped = student_answer === null || student_answer === undefined

  const accent = skipped ? '#94a3b8' : is_correct ? '#059669' : '#dc2626'
  const bgTint  = skipped ? '#f8fafc' : is_correct ? '#f0fdf4' : '#fff5f5'

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.5), ease: 'easeOut' }}
      className="rounded-2xl overflow-hidden border"
      style={{ borderColor: accent + '40', background: bgTint }}
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: `1px solid ${accent}25` }}
      >
        <span
          className="font-mono text-xs font-bold px-2 py-0.5 rounded"
          style={{ background: accent + '18', color: accent }}
        >
          Q{String(index + 1).padStart(2, '0')}
        </span>

        {skipped ? (
          <MinusCircle className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
        ) : is_correct ? (
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
        ) : (
          <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
        )}

        <span className="text-xs font-semibold" style={{ color: accent }}>
          {skipped ? 'Not attempted' : is_correct ? 'Correct' : 'Incorrect'}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {question.topic && <Badge color="blue">{question.topic}</Badge>}
          <Badge color={diffColor[question.difficulty] ?? 'slate'}>{question.difficulty}</Badge>
        </div>
      </div>

      {/* Question text */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-sm font-medium text-slate-800 leading-relaxed">{question.content}</p>
      </div>

      {/* Options */}
      <div className="px-4 pb-4 grid gap-1.5">
        {['a', 'b', 'c', 'd'].map(opt => {
          const isCorrectOpt = opt === correct_answer
          const isStudentOpt = opt === student_answer
          const isWrongChoice = isStudentOpt && !isCorrectOpt

          let bg = 'transparent'
          let border = '#e2e8f0'
          let color = '#94a3b8'
          let fontWeight = '400'

          if (isCorrectOpt) { bg = '#dcfce7'; border = '#86efac'; color = '#166534'; fontWeight = '600' }
          if (isWrongChoice) { bg = '#fee2e2'; border = '#fca5a5'; color = '#991b1b'; fontWeight = '500' }

          return (
            <div
              key={opt}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border text-xs transition-all"
              style={{ background: bg, borderColor: border, color, fontWeight }}
            >
              <span
                className="font-mono font-bold w-5 h-5 rounded flex items-center justify-center text-[11px] flex-shrink-0"
                style={{
                  background: isCorrectOpt ? '#166534' : isWrongChoice ? '#991b1b' : '#e2e8f0',
                  color: (isCorrectOpt || isWrongChoice) ? '#fff' : '#94a3b8',
                }}
              >
                {LABELS[opt]}
              </span>
              <span className="flex-1">{question[KEYS[opt]]}</span>
              {isCorrectOpt && (
                <span className="ml-auto text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Correct
                </span>
              )}
              {isWrongChoice && (
                <span className="ml-auto text-xs font-semibold text-red-700 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Your answer
                </span>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
