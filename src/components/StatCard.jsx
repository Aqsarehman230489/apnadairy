// figures share one panel, separated by hairlines (gap-px over a line-coloured background)
export function StatRow({ children, cols = 4 }) {
  const c = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }[cols]
  return <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line ${c}`}>{children}</div>
}

export default function StatCard({ label, value, note }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="display num mt-1 text-[30px] text-ink">{value ?? '—'}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  )
}
