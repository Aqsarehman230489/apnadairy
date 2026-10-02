import { Link } from 'react-router-dom'

export default function PageHeader({ title, description, back, children }) {
  return (
    <div className="mb-8 animate-rise">
      {back && (
        <Link to={back.to} className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3 py-1 text-[13px] font-medium text-muted transition-colors hover:bg-mint-soft hover:text-forest">
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-[34px] text-forest-deep sm:text-[38px]">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-[15.5px] text-muted">{description}</p>}
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  )
}
