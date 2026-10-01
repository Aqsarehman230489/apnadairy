import { useEffect, useState, useCallback } from 'react'
import { docLabel, docPlan, listDocs, uploadDoc, removeDoc, openDoc, hasRequiredDocs } from '../lib/docs'
import Alert from './Alert'

export default function DocumentUpload({ profile }) {
  const plan = docPlan[profile.role] ?? []
  const [docs, setDocs] = useState([])
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try { setDocs(await listDocs(profile.id)) } catch (e) { setError(e.message) }
  }, [profile.id])

  useEffect(() => { load() }, [load])

  const onPick = async (type, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(''); setBusy(type)
    try { await uploadDoc(profile.id, type, file); await load() } catch (err) { setError(err.message) }
    setBusy(null)
  }

  const onRemove = async (doc) => {
    setError(''); setBusy(doc.id)
    try { await removeDoc(doc); await load() } catch (err) { setError(err.message) }
    setBusy(null)
  }

  const complete = profile.role !== 'area_manager' || hasRequiredDocs(docs)

  return (
    <div className="rounded-xl border border-line bg-white/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-forest">Verification documents</p>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
          complete ? 'bg-mint-soft text-forest' : 'bg-amber/15 text-amber'}`}>
          {complete ? 'ready for review' : 'documents needed'}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {profile.role === 'area_manager'
          ? 'Required: CNIC front + at least one proof of your center (registration, utility bill, shop photo or bank statement).'
          : 'Recommended: upload registration or NTN so we can verify your business faster.'}
        {' '}JPG, PNG or PDF · max 5 MB.
      </p>

      <div className="mt-3"><Alert>{error}</Alert></div>

      <ul className="mt-3 divide-y divide-line/70">
        {plan.map((slot) => {
          const mine = docs.filter((d) => d.doc_type === slot.type)
          return (
            <li key={slot.type} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm">
                  {docLabel[slot.type]}
                  {slot.required && <span className="ml-1.5 font-mono text-[10px] uppercase text-danger">required</span>}
                  {slot.group && <span className="ml-1.5 font-mono text-[10px] uppercase text-muted">proof</span>}
                </p>
                <label className={`cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-cream-2 ${busy === slot.type ? 'opacity-50 pointer-events-none' : ''}`}>
                  {busy === slot.type ? 'Uploading…' : mine.length ? 'Add another' : 'Upload'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                    onChange={(e) => onPick(slot.type, e)} />
                </label>
              </div>
              {mine.map((d) => (
                <div key={d.id} className="mt-2 flex items-center gap-3 rounded-lg bg-cream-2 px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-forest-2" />
                  <button onClick={() => openDoc(d)} className="flex-1 truncate text-left font-mono text-[11px] text-forest hover:underline">
                    {d.file_name}
                  </button>
                  <button onClick={() => onRemove(d)} disabled={busy === d.id} className="text-[11px] text-danger hover:underline">
                    Remove
                  </button>
                </div>
              ))}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
