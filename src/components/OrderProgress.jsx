import { orderSteps } from '../lib/b2b'
import { dateTime } from '../lib/format'

const label = { confirmed: 'Confirmed', dispatched: 'On the way', delivered: 'Delivered' }

// three-step track for a bulk order (a real sequence)
export default function OrderProgress({ order }) {
  if (order.status === 'cancelled') return <span className="text-[13px] text-muted">Cancelled</span>
  const at = orderSteps.indexOf(order.status)
  const when = { confirmed: order.created_at, dispatched: order.dispatched_at, delivered: order.delivered_at }
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Order status: ${label[order.status]}`}>
      {orderSteps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5" title={when[s] ? `${label[s]} ${dateTime(when[s])}` : label[s]}>
          <span className={`h-2 w-2 rounded-full ${i <= at ? 'bg-forest' : 'bg-line'}`} />
          {i < orderSteps.length - 1 && <span className={`h-px w-5 ${i < at ? 'bg-forest' : 'bg-line'}`} />}
        </li>
      ))}
      <li className="ml-1.5 text-[13px] font-medium">{label[order.status]}</li>
    </ol>
  )
}
