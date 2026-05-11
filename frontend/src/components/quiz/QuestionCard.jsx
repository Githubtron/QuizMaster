import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'

const OPTS = ['a', 'b', 'c', 'd']
const KEYS = { a: 'option_a', b: 'option_b', c: 'option_c', d: 'option_d' }
const LABELS = { a: 'A', b: 'B', c: 'C', d: 'D' }
const diffColor = { EASY: 'green', MEDIUM: 'yellow', HARD: 'red' }

export function QuestionCard({ question, selectedAnswer, onSelect, index, total }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -18 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col gap-6"
      >
        {/* Meta row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-xs font-bold px-2.5 py-1 rounded-md"
              style={{ background: '#eef2ff', color: '#4338ca' }}
            >
              Q{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {question.chapter && (
              <span className="text-xs text-slate-400 font-medium hidden sm:block">{question.chapter}</span>
            )}
            {question.topic && <Badge color="blue">{question.topic}</Badge>}
            <Badge color={diffColor[question.difficulty] ?? 'slate'}>{question.difficulty}</Badge>
          </div>
        </div>

        {/* Question text — large, readable */}
        <div className="relative">
          {/* Watermark question number */}
          <span
            className="absolute -top-2 -left-2 font-mono font-bold text-[80px] leading-none select-none pointer-events-none"
            style={{ color: '#eef2ff', zIndex: 0 }}
            aria-hidden
          >
            {index + 1}
          </span>
          <p className="relative z-10 text-[1.1rem] font-semibold text-slate-900 leading-relaxed">
            {question.content}
          </p>
        </div>

        {/* Options */}
        <div className="grid gap-2.5">
          {OPTS.map(opt => {
            const isSelected = selectedAnswer === opt
            return (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.985 }}
                onClick={() => onSelect(question.id, opt)}
                className="group relative flex items-center gap-4 w-full text-left rounded-xl border transition-all duration-150 overflow-hidden"
                style={{
                  background: isSelected ? '#eef2ff' : '#f8fafc',
                  borderColor: isSelected ? '#4338ca' : '#e2e8f0',
                  borderWidth: isSelected ? 2 : 1,
                  padding: '14px 18px',
                }}
              >
                {/* Left accent bar */}
                <motion.div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                  animate={{ opacity: isSelected ? 1 : 0 }}
                  style={{ background: 'linear-gradient(to bottom, #4338ca, #6366f1)' }}
                />

                {/* Option label bubble */}
                <span
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold font-mono transition-all duration-150"
                  style={{
                    background: isSelected ? '#4338ca' : '#e2e8f0',
                    color: isSelected ? '#fff' : '#64748b',
                  }}
                >
                  {LABELS[opt]}
                </span>

                <span className="flex-1 text-sm font-medium" style={{ color: isSelected ? '#1e1b4b' : '#374151' }}>
                  {question[KEYS[opt]]}
                </span>

                {/* Checkmark */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: '#4338ca' }}
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
