const tones = {
  green: 'bg-mint-soft text-forest ring-mint',
  amber: 'bg-haldi-soft text-amber ring-[#efd59a]',
  red: 'bg-[#f8e2dc] text-danger ring-[#efc6bb]',
  grey: 'bg-cream-2 text-muted ring-line',
  blue: 'bg-[#e3edf0] text-[#2b5866] ring-[#cadde2]',
}

export const statusTone = {
  active: 'green', open: 'green', submitted: 'blue', accepted: 'green', awarded: 'green',
  confirmed: 'blue', dispatched: 'amber', delivered: 'green',
  pending: 'amber', rejected: 'red', suspended: 'grey', cancelled: 'grey',
  closed: 'grey', withdrawn: 'grey', not_selected: 'grey',
}

const labels = { not_selected: 'Not selected' }

export default function Badge({ status, tone, children, dot = true }) {
  const key = tone ?? statusTone[status] ?? 'grey'
  const text = children ?? labels[status] ?? (status ? status.charAt(0).toUpperCase() + status.slice(1) : '')
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ring-1 ring-inset ${tones[key]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {text}
    </span>
  )
}
