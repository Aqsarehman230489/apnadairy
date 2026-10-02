import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { requirementForCenter, placeBid, withdrawBid, milkLabel, qualityLabel } from '../../lib/b2b'
import { useLoad } from '../../lib/useLoad'
import { rs, litres, date, dateTime, relative, cap } from '../../lib/format'
import PageHeader from '../../components/PageHeader'
import Badge from '../../components/Badge'
import Alert from '../../components/Alert'
import Loader from '../../components/Loader'

export default function RequestDetail() {
  const { id } = useParams()
  const { data: req, error, loading, reload } = useLoad(() => requirementForCenter(id), [id])
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ type: 'error', text: '' })

  // prefill from my existing bid, otherwise from the request
  useEffect(() => {
    if (!req) return
    const b = req.my_bid?.status === 'submitted' ? req.my_bid : null
    setF({
      price: b?.price_per_l ?? '',
      quantity: b?.quantity_l ?? req.quantity_l,
      delivery_date: b?.delivery_date ?? req.required_date,
      fat: b?.fat_percent ?? '',
      max_age: b?.max_age_hours ?? '',
      notes: b?.notes ?? '',
    })
  }, [req])

  if ((loading && !req) || (req && !f)) return <Loader />
  if (error) return <Alert>{error}</Alert>

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const open = req.status === 'open' && new Date(req.bid_deadline) > new Date()
  const mine = req.my_bid
  const live = mine?.status === 'submitted'
  const total = Number(f.price || 0) * Number(f.quantity || 0)
  const diff = req.target_price && f.price ? Number(f.price) - Number(req.target_price) : null

  // what the buyer's "best matches" check will say about this bid
  const warnings = []
  if (Number(f.quantity) < Number(req.quantity_l)) warnings.push(`You're offering less than the ${litres(req.quantity_l)} requested.`)
  if (f.delivery_date > req.required_date) warnings.push(`Delivery is after the buyer's date (${date(req.required_date)}).`)
  if (req.min_fat && (!f.fat || Number(f.fat) < Number(req.min_fat))) warnings.push(`The buyer wants at least ${req.min_fat}% fat.`)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg({ type: 'error', text: '' })
    try {
      await placeBid({
        p_requirement: req.id, p_price: Number(f.price), p_quantity: Number(f.quantity), p_delivery_date: f.delivery_date,
        p_fat: f.fat ? Number(f.fat) : null, p_max_age_hours: f.max_age ? Number(f.max_age) : null, p_notes: f.notes.trim() || null,
      })
      await reload()
      setMsg({ type: 'success', text: live ? 'Bid updated. The buyer sees your new price.' : 'Bid sent. The buyer can now compare it.' })
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
    setBusy(false)
  }

  const withdraw = async () => {
    if (!window.confirm('Withdraw your bid? You can bid again while the request is open.')) return
    setBusy(true)
    try { await withdrawBid(mine.id); await reload(); setMsg({ type: 'success', text: 'Bid withdrawn.' }) } catch (err) { setMsg({ type: 'error', text: err.message }) }
    setBusy(false)
  }

  return (
    <>
      <PageHeader back={{ to: '/manager/bulk-requests', label: 'Bulk requests' }}
        title={`${litres(req.quantity_l)} ${milkLabel[req.milk_type].toLowerCase()}`}
        description={`${req.business?.business_name ?? 'A verified business'} (${cap(req.business?.business_type)}) needs ${qualityLabel[req.quality].toLowerCase()} quality milk in ${req.delivery_city} by ${date(req.required_date)}.`} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-6">
          <dl className="panel divide-y divide-line">
            {[
              ['Quantity', litres(req.quantity_l)],
              ['Needed on', date(req.required_date)],
              ['Delivery city', req.delivery_city],
              ['Quality', `${qualityLabel[req.quality]}${req.min_fat ? `, at least ${req.min_fat}% fat` : ''}`],
              ['Buyer\'s target', req.target_price ? `${rs(req.target_price)} per litre` : 'No target, best offer'],
              ['Bidding closes', `${dateTime(req.bid_deadline)}${open ? ` (${relative(req.bid_deadline)})` : ''}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 px-5 py-3.5">
                <dt className="text-muted">{k}</dt><dd className="num text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {req.notes && (
            <div className="panel px-5 py-4">
              <p className="text-[13px] text-muted">Buyer's notes</p>
              <p className="mt-1">{req.notes}</p>
            </div>
          )}
          <p className="text-sm text-muted">The full delivery address is shared only with the center whose bid is accepted.</p>
        </section>

        <aside className="lg:sticky lg:top-10 lg:self-start">
          <div className="panel p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="display text-[26px]">{live ? 'Your bid' : 'Place a bid'}</h2>
              {mine && <Badge status={mine.status}>{mine.status === 'submitted' ? 'Sent' : mine.status === 'accepted' ? 'Won' : undefined}</Badge>}
            </div>

            {mine?.status === 'accepted' ? (
              <p className="text-forest">The buyer accepted your bid at <strong className="num">{rs(mine.price_per_l)}/L</strong>. Find it under Bulk orders.</p>
            ) : !open ? (
              <p className="text-muted">Bidding on this request has closed.</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <Alert type={msg.type}>{msg.text}</Alert>
                <div className="field">
                  <label htmlFor="price">Your price per litre (Rs)</label>
                  <input id="price" type="number" min="1" step="0.5" required className="input num text-lg" value={f.price} onChange={set('price')} />
                  {diff != null && (
                    <p className={`hint ${diff <= 0 ? 'text-forest' : 'text-amber'}`}>
                      {diff === 0 ? 'Exactly the buyer\'s target.' : `${rs(Math.abs(diff))} ${diff < 0 ? 'below' : 'above'} the buyer's target.`}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label htmlFor="q">Litres you can supply</label>
                    <input id="q" type="number" min="1" max={req.quantity_l} step="1" required className="input num" value={f.quantity} onChange={set('quantity')} />
                  </div>
                  <div className="field">
                    <label htmlFor="d">Delivery date</label>
                    <input id="d" type="date" required className="input num" min={new Date().toISOString().slice(0, 10)} value={f.delivery_date} onChange={set('delivery_date')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label htmlFor="fat">Fat %</label>
                    <input id="fat" type="number" min="0" max="15" step="0.1" className="input num" value={f.fat} onChange={set('fat')} placeholder={req.min_fat ? `${req.min_fat}+` : '4.0'} />
                  </div>
                  <div className="field">
                    <label htmlFor="age">Max age on arrival (h)</label>
                    <input id="age" type="number" min="1" max="96" step="1" className="input num" value={f.max_age} onChange={set('max_age')} placeholder="12" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="n">Note to buyer <span className="font-normal text-muted">(optional)</span></label>
                  <textarea id="n" rows={2} className="input" value={f.notes} onChange={set('notes')} placeholder="Chilled tanker, morning delivery…" />
                </div>

                {warnings.length > 0 && (
                  <ul className="space-y-1 rounded-lg bg-[#fbf0dc] px-3.5 py-2.5 text-[13px] text-amber">
                    {warnings.map((w) => <li key={w}>{w}</li>)}
                    <li className="text-ink/70">The buyer will see this bid outside their best matches.</li>
                  </ul>
                )}

                <div className="flex items-baseline justify-between border-t border-line pt-4">
                  <span className="text-muted">Order value</span>
                  <span className="display num text-[26px]">{rs(total)}</span>
                </div>
                <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : live ? 'Update bid' : 'Send bid'}</button>
                {live && <button type="button" className="btn-danger w-full" disabled={busy} onClick={withdraw}>Withdraw bid</button>}
              </form>
            )}
          </div>
        </aside>
      </div>
    </>
  )
}
