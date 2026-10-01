export default function Loader({ label = 'loading' }) {
  return (
    <div className="min-h-full grid place-items-center bg-cream">
      <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted">
        <span className="h-2 w-2 rounded-full bg-forest pulse-dot" />
        {label}
      </div>
    </div>
  )
}
