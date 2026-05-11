export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: 'white', border: '1px solid #e0e7ff' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-4 w-2/3 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <Skeleton className="h-9 w-full rounded-xl mt-4" />
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: 'white', border: '1px solid #e0e7ff' }}
    >
      <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-7 w-16 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}
