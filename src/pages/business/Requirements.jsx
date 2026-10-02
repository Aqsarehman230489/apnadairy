import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { myRequirements, milkLabel, qualityLabel } from '../../lib/b2b'
import { useLoad } from '../../lib/useLoad'
import { rs, litres, date, relative } from '../../lib/format'
import PageHeader from '../../components/PageHeader'
import Segmented from '../../components/Segmented'
import Badge from '../../components/Badge'
import Alert from '../../components/Alert'
import EmptyState from '../../components/EmptyState'

const filters = [
  { value: 'open', label: 'Receiving bids' },
  { value: 'awarded', label: 'Awarded' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
]

export default function Requirements() {
  const nav = useNavigate()
  const { data, error, loading } = useLoad(myRequirements)
  const [filter, setFilter] = useState('open')

  const rows = useMemo(() => (data ?? []).filter((r) => filter === 'all' || r.status === filter), [data, filter])
  const count = (s) => (data ?? []).filter((r) => s === 'all' || r.status === s).length

  return (
    <>
      <PageHeader title="My requirements" description="Post how much milk you need and when. Verified collection centers send you sealed bids, and you choose one.">
        <Link to="/business/requirements/new" className="btn-primary">Post a requirement</Link>
      </PageHeader>

      <div className="mb-4">
        <Segmented value={filter} onChange={setFilter} options={filters.map((f) => ({ ...f, count: data ? count(f.value) : null }))} />
      </div>
      <Alert>{error}</Alert>

      <div className="panel overflow-x-auto">
        <table className="table min-w-[820px]">
          <thead>
            <tr><th>Requirement</th><th>Delivery</th><th className="text-right">Target</th><th className="text-right">Bids</th><th>Bidding closes</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center text-muted">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6}>
                <EmptyState title={filter === 'open' ? 'No requirements are taking bids' : 'Nothing here yet'}
                  action={<Link to="/business/requirements/new" className="btn-secondary btn-sm">Post a requirement</Link>}>
                  Tell centers the quantity, date and quality you need.
                </EmptyState>
              </td></tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => nav(`/business/requirements/${r.id}`)}>
                <td>
                  <Link to={`/business/requirements/${r.id}`} className="font-semibold text-ink hover:underline" onClick={(e) => e.stopPropagation()}>
                    {litres(r.quantity_l)} {milkLabel[r.milk_type].toLowerCase()}
                  </Link>
                  <p className="text-[13px] text-muted">{qualityLabel[r.quality]} quality{r.min_fat ? `, fat ${r.min_fat}%+` : ''}</p>
                </td>
                <td className="num">{date(r.required_date)}<p className="text-[13px] text-muted">{r.delivery_city}</p></td>
                <td className="num text-right">{r.target_price ? rs(r.target_price) : <span className="text-muted">Open</span>}</td>
                <td className="num text-right font-semibold">{r.bid_count}</td>
                <td className="text-muted">{r.status === 'open' ? (new Date(r.bid_deadline) > new Date() ? relative(r.bid_deadline) : 'Closed, choose a bid') : '—'}</td>
                <td><Badge status={r.status === 'open' ? 'open' : r.status}>{r.status === 'open' ? 'Receiving bids' : undefined}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
