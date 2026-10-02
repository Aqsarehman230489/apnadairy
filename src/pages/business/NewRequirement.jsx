import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { milkLabel, qualityLabel } from '../../lib/b2b'
import { rs, litres, date } from '../../lib/format'
import PageHeader from '../../components/PageHeader'
import Segmented from '../../components/Segmented'
import Alert from '../../components/Alert'

const iso = (d) => d.toISOString().slice(0, 10)
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d }

export default function NewRequirement() {
  const nav = useNavigate()
  const [f, setF] = useState({
    milk_type: 'cow', quantity_l: '', required_date: iso(plusDays(7)), quality: 'standard',
    min_fat: '', target_price: '', deadline_date: iso(plusDays(5)), deadline_time: '18:00',
    delivery_city: '', delivery_address: '', notes: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target ? e.target.value : e })

  const deadline = useMemo(() => new Date(`${f.deadline_date}T${f.deadline_time}`), [f.deadline_date, f.deadline_time])
  const problems = []
  if (f.required_date && f.required_date < iso(new Date())) problems.push('Delivery date is in the past.')
  if (deadline <= new Date()) problems.push('Bidding must close in the future.')
  if (f.deadline_date > f.required_date) problems.push('Bidding must close on or before the delivery date.')

  const onSubmit = async (e) => {
    e.preventDefault()
    if (problems.length) return setError(problems[0])
    setError(''); setBusy(true)
    const { data: businessId, error: idErr } = await supabase.rpc('my_business_id')
    if (idErr || !businessId) { setBusy(false); return setError('Your business account must be approved before you can post.') }

    const { data, error } = await supabase.from('bulk_requirements').insert({
      business_id: businessId,
      milk_type: f.milk_type,
      quantity_l: Number(f.quantity_l),
      required_date: f.required_date,
      quality: f.quality,
      min_fat: f.min_fat ? Number(f.min_fat) : null,
      target_price: f.target_price ? Number(f.target_price) : null,
      bid_deadline: deadline.toISOString(),
      delivery_city: f.delivery_city.trim(),
      delivery_address: f.delivery_address.trim() || null,
      notes: f.notes.trim() || null,
    }).select('id').single()
    setBusy(false)
    if (error) return setError(error.message)
    nav(`/business/requirements/${data.id}`, { replace: true })
  }

  return (
    <>
      <PageHeader title="Post a requirement" back={{ to: '/business/requirements', label: 'My requirements' }}
        description="Collection centers see this on the bulk request board and reply with sealed bids. Your business name is only shown to verified centers." />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={onSubmit} className="panel space-y-6 p-6">
          <Alert>{error}</Alert>

          <div className="field">
            <label>Milk</label>
            <Segmented value={f.milk_type} onChange={set('milk_type')} options={Object.entries(milkLabel).map(([value, label]) => ({ value, label }))} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="qty">Quantity (litres)</label>
              <input id="qty" type="number" min="1" step="1" className="input num" required value={f.quantity_l} onChange={set('quantity_l')} placeholder="500" />
            </div>
            <div className="field">
              <label htmlFor="req-date">Needed on</label>
              <input id="req-date" type="date" className="input num" required min={iso(new Date())} value={f.required_date} onChange={set('required_date')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label>Quality</label>
              <Segmented value={f.quality} onChange={set('quality')} options={Object.entries(qualityLabel).map(([value, label]) => ({ value, label }))} />
            </div>
            <div className="field">
              <label htmlFor="fat">Minimum fat % <span className="font-normal text-muted">(optional)</span></label>
              <input id="fat" type="number" min="0" max="15" step="0.1" className="input num" value={f.min_fat} onChange={set('min_fat')} placeholder="3.5" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="target">Target price per litre <span className="font-normal text-muted">(optional)</span></label>
            <input id="target" type="number" min="1" step="0.5" className="input num sm:max-w-[240px]" value={f.target_price} onChange={set('target_price')} placeholder="190" />
            <p className="hint">Centers see this as a guide. You can still accept a bid above it.</p>
          </div>

          <div className="field">
            <label>Bidding closes</label>
            <div className="flex gap-3">
              <input type="date" className="input num flex-1" required value={f.deadline_date} onChange={set('deadline_date')} />
              <input type="time" className="input num w-32" required value={f.deadline_time} onChange={set('deadline_time')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr]">
            <div className="field">
              <label htmlFor="city">Delivery city</label>
              <input id="city" className="input" required value={f.delivery_city} onChange={set('delivery_city')} placeholder="Islamabad" />
            </div>
            <div className="field">
              <label htmlFor="addr">Delivery address</label>
              <input id="addr" className="input" value={f.delivery_address} onChange={set('delivery_address')} placeholder="Shown only to the center you choose" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">Notes for centers <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="notes" rows={3} className="input" value={f.notes} onChange={set('notes')} placeholder="Delivery window, container size, chilled transport…" />
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-5">
            <button type="button" className="btn-secondary" onClick={() => nav(-1)}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? 'Posting…' : 'Post requirement'}</button>
          </div>
        </form>

        {/* live preview of the board entry */}
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <p className="mb-2 text-[13px] text-muted">How centers will see it</p>
          <div className="panel p-5">
            <p className="display num text-[30px]">{f.quantity_l ? litres(f.quantity_l) : '— L'}</p>
            <p className="font-semibold">{milkLabel[f.milk_type]}, {qualityLabel[f.quality].toLowerCase()} quality</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted">Needed on</dt><dd className="num">{date(f.required_date)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Deliver to</dt><dd>{f.delivery_city || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Target</dt><dd className="num">{f.target_price ? `${rs(f.target_price)} / L` : 'Open'}</dd></div>
              {f.min_fat && <div className="flex justify-between gap-4"><dt className="text-muted">Minimum fat</dt><dd className="num">{f.min_fat}%</dd></div>}
              <div className="flex justify-between gap-4"><dt className="text-muted">Bids close</dt><dd className="num">{date(f.deadline_date)}, {f.deadline_time}</dd></div>
            </dl>
            {f.quantity_l && f.target_price && (
              <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
                At your target this order is about <span className="num font-semibold text-ink">{rs(Number(f.quantity_l) * Number(f.target_price))}</span>.
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  )
}
