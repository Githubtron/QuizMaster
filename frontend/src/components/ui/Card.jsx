export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={`px-6 pt-6 pb-4 ${className}`}>{children}</div>
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-6 pb-6 ${className}`}>{children}</div>
}
