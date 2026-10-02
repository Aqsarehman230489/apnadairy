import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { requirementWithBids, rankBids, bidIssues, acceptBid, cancelRequirement, milkLabel, qualityLabel } from '../../lib/b2b'
import { useLoad } from '../../lib/useLoad'
import { rs, litres, date, dateTime, relative } from '../../lib/format'
import PageHeader from '../../components/PageHeader'
import PriceLadder from '../../components/PriceLadder'
import Badge from '../../components/Badge'
import Alert from '../../components/Alert'
import EmptyState from '../../components/EmptyState'
import Loader from '../../components/Loader'

function BidTable({ bids, req, canAccept, onAccept, busy, showIssues }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="table min-w-[760px]">
        <thead>
          <tr>
            <th>Collection center</th><th className="text-right">Price / L</th><th className="text-right">Total</th>
            <th>Delivers</th><th>Milk</th>{showIssues && <th>Why it falls short</th>}<th></th>
          </tr>
        </thead>
        <tbody>
          {bids.map((b) => {
            const diff = req.target_price ? Number(b.price_per_l) - Number(req.target_price) : null
            return (
              <tr key={b.id}>
                <td>
                  <p className="font-semibold">{b.center?.center_name ?? 'Collection center'}</p>
                  <p className="text-[13px] text-muted">{b.center?.city}</p>
                </td>
                <td className="num text-right">
                  <span className="font-semibold">{rs(b.price_per_l)}</span>
                  {diff != null && (
                    <p className={`text-[13px] ${diff <= 0 ? 'text-forest' : 'text-amber'}`}>
                      {diff === 0 ? 'at target' : `${rs(Math.abs(diff))} ${diff < 0 ? 'under' : 'over'} target`}
                    </p>
                  )}
                </td>
                <td className="num text-right">{rs(b.price_per_l * b.quantity_l)}<p className="text-[13px] text-muted">{litres(b.quantity_l)}</p></td>
                <td className="num">{date(b.delivery_date)}</td>
                <td className="text-[13px]">
                  {b.fat_percent ? `Fat ${b.fat_percent}%` : 'Fat not stated'}
                  <p className="text-muted">{b.max_age_hours ? `Under ${b.max_age_hours} h old on arrival` : 'Age not stated'}</p>
                </td>
                {showIssues && <td className="text-[13px] text-amber">{bidIssues(b, req).join(', ')}</td>}
                <td className="text-right">
                  {b.status === 'accepted' && <Badge status="accepted" />}
                  {canAccept && b.status === 'submitted' && (
                    <button className="btn-primary btn-sm" disabled={busy} onClick={() => onAccept(b)}>Accept bid</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {bids.some((b) => b.notes) && (
        <div className="border-t border-line px-4 py-3 text-[13px] text-muted">
          {bids.filter((b) => b.notes).map((b) => (
            <p key={b.id}><span className="font-medium text-ink">{b.center?.center_name}:</span> {b.notes}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RequirementDetail() {
  const { id } = useParams()
  const { data: req, error, loading, reload } = useLoad(() => requirementWithBids(id), [id])
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  if (loading && !req) return <Loader />
  if (error) return <Alert>{error}</Alert>

  const { top, others } = rankBids(req.bids, req)
  const isOpen = req.status === 'open'
  const biddingLive = isOpen && new Date(req.bid_deadline) > new Date()
  const accepted = req.bids.find((b) => b.status === 'accepted')
  const ladderRows = [...top, ...others].map((b) => ({
    id: b.id, label: b.center?.center_name ?? 'Center', price: b.price_per_l, ok: bidIssues(b, req).length === 0,
  }))

  const onAccept = async (b) => {
    if (!window.confirm(`Accept ${b.center?.center_name}'s bid of ${rs(b.price_per_l)}/L for ${litres(b.quantity_l)}? Other bids will be declined.`)) return
    setBusy(true); setActionError('')
    try { await acceptBid(b.id); await reload() } catch (e) { setActionError(e.message) }
    setBusy(false)
  }
  const onCancel = async () => {
    if (!window.confirm('Cancel this requirement? All bids on it will be declined.')) return
    setBusy(true); setActionError('')
    try { await cancelRequirement(req.id); await reload() } catch (e) { setActionError(e.message) }
    setBusy(false)
  }

  return (
    <>
      <PageHeader back={{ to: '/business/requirements', label: 'My requirements' }}
        title={`${litres(req.quantity_l)} ${milkLabel[req.milk_type].toLowerCase()}`}
        description={`${qualityLabel[req.quality]} quality${req.min_fat ? `, at least ${req.min_fat}% fat` : ''}, delivered to ${req.delivery_city} on ${date(req.required_date)}.`}>
        {isOpen && <button className="btn-danger" onClick={onCancel} disabled={busy}>Cancel requirement</button>}
      </PageHeader>

      <dl className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line lg:grid-cols-4">
        {[
          ['Status', <Badge key="s" status={req.status}>{biddingLive ? 'Receiving bids' : isOpen ? 'Bidding closed' : undefined}</Badge>],
          ['Target', req.target_price ? `${rs(req.target_price)} / L` : 'Open'],
          ['Bidding closes', isOpen ? `${dateTime(req.bid_deadline)} (${relative(req.bid_deadline)})` : dateTime(req.bid_deadline)],
          ['Bids', `${top.length + others.length}`],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface px-5 py-4">
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="num mt-1 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <Alert>{actionError}</Alert>

      {accepted && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-mint bg-mint-soft px-5 py-4">
          <p className="text-forest">
            You accepted <strong>{accepted.center?.center_name}</strong> at <strong className="num">{rs(accepted.price_per_l)}/L</strong>. It is now a bulk order.
          </p>
          <Link to="/business/orders" className="btn-primary btn-sm">View bulk order</Link>
        </div>
      )}

      {ladderRows.length === 0 ? (
        <div className="panel">
          <EmptyState title={biddingLive ? 'No bids yet' : 'No bids were received'}>
            {biddingLive ? `Verified collection centers can bid until ${dateTime(req.bid_deadline)}. Bids appear here as they arrive.` : 'You can post the requirement again with a later date or a different target.'}
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-8">
          <PriceLadder rows={ladderRows} target={req.target_price} acceptedId={accepted?.id} />

          {top.length > 0 && (
            <section>
              <h2 className="display mb-1 text-[24px]">Best matches</h2>
              <p className="mb-4 text-sm text-muted">Up to three bids that cover the full quantity, arrive on time and meet your fat minimum, cheapest first.</p>
              <BidTable bids={top} req={req} canAccept={isOpen} onAccept={onAccept} busy={busy} />
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="display mb-1 text-[24px]">Other bids</h2>
              <p className="mb-4 text-sm text-muted">These fall short on quantity, date or fat, or are more expensive than the best three. You can still accept one.</p>
              <BidTable bids={others} req={req} canAccept={isOpen} onAccept={onAccept} busy={busy} showIssues />
            </section>
          )}
        </div>
      )}

      {req.notes && <p className="mt-8 text-sm text-muted"><span className="font-medium text-ink">Your notes:</span> {req.notes}</p>}
    </>
  )
}
