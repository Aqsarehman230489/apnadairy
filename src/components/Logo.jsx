export default function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#ffffff' : '#1f5a43'} />
        <path d="M11 8h10l-1 4c2 1.5 3 3.5 3 6v5a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2v-5c0-2.5 1-4.5 3-6z" fill={light ? '#1f5a43' : '#ffffff'} />
        <path d="M9 18c2.5-1.2 4.5 1.2 7 0s4.5-1.2 7 0v5a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z" fill={light ? '#bfe1cf' : '#bfe1cf'} />
      </svg>
      <span className={`display text-[22px] ${light ? 'text-white' : 'text-ink'}`}>ApnaDairy</span>
    </div>
  )
}
