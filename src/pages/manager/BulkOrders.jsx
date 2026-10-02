import { useState } from 'react'
import { centerOrders, updateBulkOrder, milkLabel, qualityLabel } from '../../lib/b2b'
import { useLoad } from '../../lib/useLoad'
import { rs, litres, date, cap } from '../../lib/format'
import PageHeader from '../../components/PageHeader'
import OrderProgress from '../../components/OrderProgress'
import Alert from '../../components/Alert'
import EmptyState from '../../components/EmptyState'

const next = { confirmed: ['dispatched', 'Mark dispatched'], dispatched: ['delivered', 'Mark delivered'] }

export default function BulkOrders() {
  const { data, error, loading, reload } = useLoad(centerOrders)
  const [busy, setBusy] = useState(null)
  const [actionError, setActionError] = useState('')

  const move = async (o, status) => {
    if (status === 'cancelled' && !window.confirm(`Cancel the order for ${o.buyer?.business_name}?`)) return
    setBusy(o.id); setActionError('')
    try { await updateBulkOrder(o.id, status); await reload() } catch (e) { setActionError(e.message) }
    setBusy(null)
  }

  return (
    <>
      <PageHeader title="Bulk orders" description="Bids you won. Update each order when the milk leaves your center and when it reaches the buyer." />
      <Alert>{error || actionError}</Alert>
      <div className="panel overflow-x-auto">
        <table className="table min-w-[920px]">
          <thead>
            <tr><th>Buyer</th><th>Milk</th><th className="text-right">Total</th><th>Deliver to</th><th>Progress</th><th className="text-right">Next step</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center text-muted">Loading…</td></tr>}
            {!loading && data?.length === 0 && (
              <tr><td colSpan={6}><EmptyState title="No bulk orders yet">When a business accepts one of your bids, the order appears here.</EmptyState></td></tr>
            )}
            {data?.map((o) => (
              <tr key={o.id}>
                <td><p className="font-semibold">{o.buyer?.business_name}</p><p className="text-[13px] text-muted">{cap(o.buyer?.business_type)}</p></td>
                <td className="num">{litres(o.quantity_l)} at {rs(o.price_per_l)}<p className="text-[13px] text-muted">{milkLabel[o.requirement?.milk_type]}, {qualityLabel[o.requirement?.quality]?.toLowerCase()} quality</p></td>
                <td className="num text-right font-semibold">{rs(o.total_amount)}</td>
                <td className="num">{date(o.delivery_date)}<p className="text-[13px] text-muted">{o.delivery_address ? `${o.delivery_address}, ` : ''}{o.delivery_city}</p></td>
                <td><OrderProgress order={o} /></td>
                <td>
                  <div className={`flex justify-end gap-2 ${busy === o.id ? 'pointer-events-none opacity-50' : ''}`}>
                    {next[o.status] && <button className="btn-primary btn-sm" onClick={() => move(o, next[o.status][0])}>{next[o.status][1]}</button>}
                    {o.status === 'confirmed' && <button className="btn-danger btn-sm" onClick={() => move(o, 'cancelled')}>Cancel</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
