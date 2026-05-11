import { forwardRef } from 'react'

export const Input = forwardRef(function Input(
  { label, error, className = '', ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <input
        ref={ref}
        className={`
          w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900
          placeholder:text-slate-400 bg-white
          border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
          disabled:bg-slate-50 disabled:cursor-not-allowed
          outline-none transition-all duration-150
          ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})
