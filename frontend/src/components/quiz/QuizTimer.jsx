import { motion } from 'framer-motion'
import { useTimer } from '@/hooks/useTimer'

const R = 44
const CIRC = 2 * Math.PI * R

export function QuizTimer({ durationMinutes, onExpire }) {
  const durationSeconds = durationMinutes * 60
  const { minutes, seconds, fraction, isLow, isCritical } = useTimer(durationSeconds, onExpire)

  const offset = CIRC * (1 - fraction)
  const ringColor  = isCritical ? '#ef4444' : isLow ? '#f59e0b' : '#6366f1'
  const glowColor  = isCritical ? 'rgba(239,68,68,0.35)' : isLow ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.25)'
  const textColor  = isCritical ? '#ef4444' : isLow ? '#f59e0b' : '#1e3a8a'

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="relative" style={{ width: 112, height: 112 }}>
        {/* Glow layer */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-700"
          style={{ boxShadow: `0 0 24px 6px ${glowColor}` }}
        />

        {/* SVG rings */}
        <svg width="112" height="112" className="absolute inset-0 -rotate-90">
          <defs>
            <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={ringColor} />
              <stop offset="100%" stopColor={isCritical ? '#f97316' : isLow ? '#facc15' : '#818cf8'} />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle cx="56" cy="56" r={R} fill="none" stroke="#e2e8f0" strokeWidth="7" />
          {/* Animated arc */}
          <motion.circle
            cx="56" cy="56" r={R}
            fill="none"
            stroke="url(#timerGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'linear' }}
          />
        </svg>

        {/* Center display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-white/90 backdrop-blur-sm">
          <motion.span
            key={`${minutes}-${seconds}`}
            animate={isCritical ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.6, repeat: isCritical ? Infinity : 0 }}
            className="font-mono text-xl font-bold tracking-tight leading-none"
            style={{ color: textColor }}
          >
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </motion.span>
          <span className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-widest">
            {isCritical ? 'urgent' : isLow ? 'hurry' : 'left'}
          </span>
        </div>
      </div>

      {/* Status pill */}
      <motion.div
        animate={{ opacity: isLow ? 1 : 0.5 }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{
          background: isLow ? `${glowColor}` : 'transparent',
          color: isLow ? textColor : '#94a3b8',
          border: `1px solid ${isLow ? ringColor + '50' : '#e2e8f0'}`,
        }}
      >
        <motion.span
          animate={isCritical ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: ringColor }}
        />
        {isCritical ? 'Time is almost up!' : isLow ? 'Less than 20% left' : 'Timer running'}
      </motion.div>
    </div>
  )
}
