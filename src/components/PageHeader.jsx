export default function PageHeader({ eyebrow, title, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 rise">
      <div>
        {eyebrow && <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-forest-2">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl font-semibold text-forest">{title}</h1>
      </div>
      {children}
    </div>
  )
}
