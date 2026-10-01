import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/PageHeader'
import Alert from '../../components/Alert'

const tabs = [
  { id: 'area_manager', label: 'Area Managers', table: 'area_managers', fk: 'area_managers_user_id_fkey' },
  { id: 'business', label: 'Businesses', table: 'business_profiles', fk: 'business_profiles_user_id_fkey' },
]
const statuses = ['pending', 'active', 'rejected', 'suspended']

const badge = {
  pending: 'bg-amber/15 text-amber',
  active: 'bg-mint-soft text-forest',
  rejected: 'bg-danger/10 text-danger',
  suspended: 'bg-ink/10 text-ink',
}

export default function Approvals() {
  const [tab, setTab] = useState(tabs[0])
  const [status, setStatus] = useState('pending')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from(tab.table)
      .select(`*, profile:profiles!${tab.fk}(full_name, email, phone)`)
      .eq('verification_status', status)
      .order('created_at', { ascending: false })
    setError(error?.message ?? '')
    setRows(data ?? [])
    setLoading(false)
  }, [tab, status])

  useEffect(() => { load() }, [load])

  const act = async (id, next) => {
    let reason = null
    if (next === 'rejected' || next === 'suspended') {
      reason = window.prompt('Reason (optional):') ?? null
    }
    const { error } = await supabase.rpc('set_verification', { p_kind: tab.id, p_id: id, p_status: next, p_reason: reason })
    if (error) return setError(error.message)
    load()
  }

  return (
    <>
      <PageHeader eyebrow="user management" title="Approvals" />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-cream-2 p-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm ${tab.id === t.id ? 'bg-white font-semibold text-forest shadow-sm' : 'text-muted'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider ${
                status === s ? 'border-forest bg-forest text-cream' : 'border-line text-muted hover:bg-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <Alert>{error}</Alert>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white/70">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-muted">
              <th className="px-5 py-3 font-medium">{tab.id === 'area_manager' ? 'Center' : 'Business'}</th>
              <th className="px-5 py-3 font-medium">Owner</th>
              <th className="px-5 py-3 font-medium">City</th>
              <th className="px-5 py-3 font-medium">Applied</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-5 py-10 text-center text-muted">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-muted">No {status} applications.</td></tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-4">
                  <p className="font-semibold text-ink">{r.center_name ?? r.business_name}</p>
                  <p className="font-mono text-[11px] text-muted">
                    {tab.id === 'area_manager' ? (r.type === 'milk_center' ? 'milk collection center' : 'byproducts') : r.business_type}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p>{r.profile?.full_name}</p>
                  <p className="font-mono text-[11px] text-muted">{r.profile?.email} · {r.profile?.phone}</p>
                </td>
                <td className="px-5 py-4">{r.city}</td>
                <td className="px-5 py-4 font-mono text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${badge[r.verification_status]}`}>
                    {r.verification_status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    {r.verification_status !== 'active' && (
                      <button onClick={() => act(r.id, 'active')} className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-cream hover:bg-forest-2">Approve</button>
                    )}
                    {r.verification_status === 'pending' && (
                      <button onClick={() => act(r.id, 'rejected')} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5">Reject</button>
                    )}
                    {r.verification_status === 'active' && (
                      <button onClick={() => act(r.id, 'suspended')} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-cream-2">Suspend</button>
                    )}
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
