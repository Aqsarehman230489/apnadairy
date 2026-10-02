import { MilkChurn } from './Farm'

export default function EmptyState({ title, children, action }) {
  return (
    <div className="px-6 py-12 text-center">
      <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-cream-2">
        <MilkChurn size={36} body="#fffcf4" band="#e2a93b" stroke="#1f4d36" />
      </span>
      <p className="display text-[19px]">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-[14.5px] text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
