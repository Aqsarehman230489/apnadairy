import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { requestBoard, myBids, centerOrders, milkLabel } from '../../lib/b2b'
import { useLoad } from '../../lib/useLoad'
import { rs, litres, date, relative } from '../../lib/format'
import PageHeader from '../../components/PageHeader'
import StatCard, { StatRow } from '../../components/StatCard'
import EmptyState from '../../components/EmptyState'

export default function ManagerHome() {
  const { profile } = useAuth()
  const { data } = useLoad(async () => {
    const { data: center } = await supabase.from('area_managers').select('*').eq('user_id', profile.id).single()
    if (center?.type !== 'milk_center') return { center }
    const [board, bids, orders] = await Promise.all([requestBoard(), myBids(), centerOrders()])
    return { center, board, bids, orders }
  }, [profile.id])

  const c = data?.center
  const isCenter = c?.type === 'milk_center'
  const bidOn = new Set((data?.bids ?? []).filter((b) => b.status === 'submitted').map((b) => b.requirement?.id))
  const unbid = (data?.board ?? []).filter((r) => !bidOn.has(r.id))
  const active = (data?.orders ?? []).filter((o) => o.status === 'confirmed' || o.status === 'dispatched')
  const won = (data?.orders ?? []).filter((o) => o.status !== 'cancelled')

  return (
    <>
      <PageHeader title={c?.center_name ?? ' '}
        description={c ? `${isCenter ? 'Milk collection center' : 'Dairy byproducts seller'} in ${c.city}${c.address ? `, ${c.address}` : ''}.` : null} />

      {isCenter && (
        <>
          <StatRow>
            <StatCard label="Open bulk requests" value={data?.board?.length} note={`${unbid.length} you haven't bid on`} />
            <StatCard label="Bids waiting" value={bidOn.size} note="for the buyer's decision" />
            <StatCard label="Orders to deliver" value={active.length} note="confirmed or on the way" />
            <StatCard label="Bulk sales won" value={rs(won.reduce((n, o) => n + Number(o.total_amount), 0))} note={`${won.length} orders`} />
          </StatRow>

          <section className="mt-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="display text-[24px]">Requests you haven't bid on</h2>
              <Link to="/manager/bulk-requests" className="text-sm font-medium text-forest hover:underline">See all requests</Link>
            </div>
            <div className="panel overflow-x-auto">
              {data && unbid.length === 0 ? (
                <EmptyState title="You're up to date">You have bid on every open request.</EmptyState>
              ) : (
                <table className="table min-w-[640px]">
                  <thead><tr><th>Buyer</th><th>Needs</th><th>By</th><th>Closes</th><th></th></tr></thead>
                  <tbody>
                    {unbid.slice(0, 5).map((r) => (
                      <tr key={r.id}>
                        <td className="font-semibold">{r.business_name}</td>
                        <td className="num">{litres(r.quantity_l)} {milkLabel[r.milk_type].toLowerCase()}{r.target_price ? `, target ${rs(r.target_price)}` : ''}</td>
                        <td className="num">{date(r.required_date)}<p className="text-[13px] text-muted">{r.delivery_city}</p></td>
                        <td className="text-muted">{relative(r.bid_deadline)}</td>
                        <td className="text-right"><Link to={`/manager/bulk-requests/${r.id}`} className="btn-secondary btn-sm">Place a bid</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}

      {c && !isCenter && (
        <div className="panel"><EmptyState title="Product listings are coming next">Byproduct sellers will list desi ghee and other dairy products here.</EmptyState></div>
      )}
    </>
  )
}
