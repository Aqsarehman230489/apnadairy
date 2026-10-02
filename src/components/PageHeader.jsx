import { Link } from 'react-router-dom'

// back = { to, label } for detail pages
export default function PageHeader({ title, description, back, children }) {
  return (
    <div className="mb-8">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <span aria-hidden>‹</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-[34px] text-ink">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-[15px] text-muted">{description}</p>}
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  )
}
