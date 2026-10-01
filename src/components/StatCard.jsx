export default function StatCard({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-5 rise">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-forest tabular-nums">{value ?? '—'}</p>
      {note && <p className="mt-1 font-mono text-[11px] text-muted">{note}</p>}
    </div>
  )
}
