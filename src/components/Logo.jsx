export default function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#a8d5ba' : '#1f3d2b'} />
        <path d="M11 9h10l-1 4c2 1.5 3 3.5 3 6v4a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2v-4c0-2.5 1-4.5 3-6z" fill={light ? '#12261a' : '#f6f1e7'} />
        <path d="M9 18h14v5a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z" fill={light ? '#2b5239' : '#a8d5ba'} />
      </svg>
      <span className={`font-display text-xl font-semibold tracking-tight ${light ? 'text-cream' : 'text-forest'}`}>
        ApnaDairy
      </span>
    </div>
  )
}
