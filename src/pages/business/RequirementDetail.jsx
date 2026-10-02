import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { requirementWithBids, rankBids, bidIssues, freshnessText, acceptBid, cancelRequirement, milkLabel, qualityLabel } from '../../lib/b2b'
import { useLoad } from '../../lib/useLoad'
import { useUi } from '../../context/UiContext'
import { rs, litres, date, dateTime, relative } from '../../lib/format'
import PageHeader from '../../components/PageHeader'
import PriceLadder from '../../components/PriceLadder'
import Badge from '../../components/Badge'
import Alert from '../../components/Alert'
import EmptyState from '../../components/EmptyState'
import Loader from '../../components/Loader'

function BidCard({ b, req, rank, canAccept, onAccept, busy, highlight }) {
  const diff = req.target_price ? Number(b.price_per_l) - Number(req.target_price) : null
  const issues = bidIssues(b, req)
  return (
    <article id={`bid-${b.id}`} className={`panel relative animate-rise p-5 transition-shadow ${highlight ? 'ring-2 ring-haldi' : ''}`}>
      {rank === 1 && <span className="absolute -top-3 left-5 rounded-full bg-haldi px-3 py-0.5 text-[12.5px] font-bold text-forest-deep">Best price</span>}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold">{b.center?.center_name ?? 'Collection center'}</p>
          <p className="text-[13px] text-muted">{b.center?.city}</p>
        </div>
        {b.status === 'accepted' && <Badge status="accepted" />}
      </div>

      <p className="display num mt-4 text-[34px] text-forest-deep">{rs(b.price_per_l)}<span className="text-[16px] font-medium text-muted"> / L</span></p>
      {diff != null && (
        <p className={`text-[13.5px] font-medium ${diff <= 0 ? 'text-forest' : 'text-amber'}`}>
          {diff === 0 ? 'Right on your target' : `${rs(Math.abs(diff))} ${diff < 0 ? 'below' : 'above'} your target`}
        </p>
      )}

      <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-[14px]">
        <div className="flex justify-between gap-3"><dt className="text-muted">Supplies</dt><dd className="num font-medium">{litres(b.quantity_l)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Arrives</dt><dd className="num font-medium">{date(b.delivery_date)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Freshness</dt><dd className="font-medium">{freshnessText(b.max_age_hours)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Total</dt><dd className="num font-bold">{rs(b.price_per_l * b.quantity_l)}</dd></div>
      </dl>

      {issues.length > 0 && <p className="mt-3 rounded-xl bg-haldi-soft px-3 py-2 text-[13px] text-amber">{issues.join('. ')}.</p>}
      {b.notes && <p className="mt-3 text-[13.5px] text-muted">“{b.notes}”</p>}

      {canAccept && b.status === 'submitted' && (
        <button className={`${rank ? 'btn-primary' : 'btn-secondary'} mt-5 w-full`} disabled={busy} onClick={() => onAccept(b)}>Accept this bid</button>
      )}
    </article>
  )
}

export default function RequirementDetail() {
  const { id } = useParams()
  const { toast, confirm } = useUi()
  const { data: req, error, loading, reload } = useLoad(() => requirementWithBids(id), [id])
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState(null)

  if (loading && !req) return <Loader />
  if (error) return <Alert>{error}</Alert>

  const { top, others } = rankBids(req.bids, req)
  const isOpen = req.status === 'open'
  const biddingLive = isOpen && new Date(req.bid_deadline) > new Date()
  const accepted = req.bids.find((b) => b.status === 'accepted')
  const ladderRows = [...top, ...others].map((b) => ({
    id: b.id, label: b.center?.center_name ?? 'Center', price: b.price_per_l, quantity: b.quantity_l, ok: bidIssues(b, req).length === 0,
  }))

  const pick = (bidId) => {
    setPicked(bidId)
    document.getElementById(`bid-${bidId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const onAccept = async (b) => {
    const ok = await confirm({
      title: `Buy from ${b.center?.center_name}?`,
      body: `${litres(b.quantity_l)} at ${rs(b.price_per_l)} per litre, ${rs(b.price_per_l * b.quantity_l)} in total, delivered on ${date(b.delivery_date)}. The other bids will be declined.`,
      confirmLabel: 'Accept bid',
    })
    if (!ok) return
    setBusy(true)
    try { await acceptBid(b.id); await reload(); toast(`Order placed with ${b.center?.center_name}.`) } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }
  const onCancel = async () => {
    const ok = await confirm({ title: 'Cancel this requirement?', body: 'Centers can no longer bid, and the bids you have received will be declined.', confirmLabel: 'Cancel requirement', danger: true, cancelLabel: 'Keep it' })
    if (!ok) return
    setBusy(true)
    try { await cancelRequirement(req.id); await reload(); toast('Requirement cancelled.') } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }

  return (
    <>
      <PageHeader back={{ to: '/business/requirements', label: 'My requirements' }}
        title={`${litres(req.quantity_l)} ${milkLabel[req.milk_type].toLowerCase()}`}
        description={`${qualityLabel[req.quality]} milk for ${req.delivery_city}, needed on ${date(req.required_date)}.`}>
        {isOpen && <button className="btn-danger" onClick={onCancel} disabled={busy}>Cancel requirement</button>}
      </PageHeader>

      <div className="mb-8 flex flex-wrap gap-2">
        <Badge status={req.status}>{biddingLive ? 'Taking bids' : isOpen ? 'Bidding closed, pick a bid' : undefined}</Badge>
        <span className="rounded-full bg-cream-2 px-3 py-1 text-[13px] font-medium">{qualityLabel[req.quality]}</span>
        <span className="num rounded-full bg-cream-2 px-3 py-1 text-[13px] font-medium">Target {req.target_price ? `${rs(req.target_price)} / L` : 'best offer'}</span>
        <span className="num rounded-full bg-cream-2 px-3 py-1 text-[13px] font-medium">
          {isOpen ? `Bids close ${relative(req.bid_deadline)}` : `Closed ${dateTime(req.bid_deadline)}`}
        </span>
      </div>

      {accepted && (
        <div className="mb-8 flex animate-pop flex-wrap items-center justify-between gap-3 rounded-[20px] bg-forest px-6 py-5 text-cream">
          <p className="text-[15.5px]">
            You're buying from <strong>{accepted.center?.center_name}</strong> at <strong className="num text-haldi">{rs(accepted.price_per_l)}/L</strong>.
          </p>
          <Link to="/business/orders" className="btn-secondary btn-sm">Track the order</Link>
        </div>
      )}

      {ladderRows.length === 0 ? (
        <div className="panel">
          <EmptyState title={biddingLive ? 'Waiting for the first bid' : 'No bids came in'}>
            {biddingLive ? `Centers can bid until ${dateTime(req.bid_deadline)}. Bids show up here as soon as they're sent.` : 'Try posting again with a later date or a different target price.'}
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-10">
          <PriceLadder rows={ladderRows} target={req.target_price} acceptedId={accepted?.id} onPick={pick} />

          {top.length > 0 && (
            <section>
              <h2 className="display text-[26px]">Best matches</h2>
              <p className="mb-5 mt-1 text-muted">Bids that cover all your litres and arrive on time, cheapest first.</p>
              <div className="grid gap-5 pt-2 md:grid-cols-2 xl:grid-cols-3">
                {top.map((b, i) => <BidCard key={b.id} b={b} req={req} rank={i + 1} canAccept={isOpen} onAccept={onAccept} busy={busy} highlight={picked === b.id} />)}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="display text-[26px]">Other bids</h2>
              <p className="mb-5 mt-1 text-muted">These fall short somewhere or cost more than the best matches. You can still accept one.</p>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {others.map((b) => <BidCard key={b.id} b={b} req={req} canAccept={isOpen} onAccept={onAccept} busy={busy} highlight={picked === b.id} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {req.notes && <p className="mt-10 text-[14.5px] text-muted"><span className="font-semibold text-ink">Your note to centers:</span> {req.notes}</p>}
    </>
  )
}
