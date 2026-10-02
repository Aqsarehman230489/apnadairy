// status pill: tone decides colour, text stays sentence case
const tones = {
  green: 'bg-mint-soft text-forest',
  amber: 'bg-[#fbf0dc] text-amber',
  red: 'bg-[#f8e4e0] text-danger',
  grey: 'bg-cream-2 text-muted',
  blue: 'bg-[#e4eef6] text-[#24557a]',
}

export const statusTone = {
  active: 'green', open: 'blue', submitted: 'blue', accepted: 'green', awarded: 'green',
  confirmed: 'blue', dispatched: 'amber', delivered: 'green',
  pending: 'amber', rejected: 'red', suspended: 'grey', cancelled: 'grey',
  closed: 'grey', withdrawn: 'grey', not_selected: 'grey',
}

const labels = { not_selected: 'Not selected' }

export default function Badge({ status, tone, children }) {
  const t = tones[tone ?? statusTone[status] ?? 'grey']
  const text = children ?? labels[status] ?? (status ? status.charAt(0).toUpperCase() + status.slice(1) : '')
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${t}`}>{text}</span>
}
