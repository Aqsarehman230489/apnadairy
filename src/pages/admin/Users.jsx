import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { roleLabel } from '../../lib/roles'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import Alert from '../../components/Alert'

const roleFilters = ['all', 'super_admin', 'area_manager', 'business', 'farmer', 'customer']

const statusBadge = {
  pending: 'bg-amber/15 text-amber',
  active: 'bg-mint-soft text-forest',
  rejected: 'bg-danger/10 text-danger',
  suspended: 'bg-ink/10 text-ink',
}

export default function Users() {
  const { profile: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, status, created_at')
      .order('created_at', { ascending: false })
    setError(error?.message ?? '')
    setUsers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) =>
      (role === 'all' || u.role === role) &&
      (!q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone ?? '').includes(q)))
  }, [users, search, role])

  const countOf = (r) => users.filter((u) => u.role === r).length

  const run = async (userId, rpc, args, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return
    setError(''); setBusy(userId)
    const { error } = await supabase.rpc(rpc, { p_user: userId, ...args })
    setBusy(null)
    if (error) return setError(error.message)
    load()
  }

  return (
    <>
      <PageHeader eyebrow="user management" title="Users" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All accounts" value={users.length} note="every role" />
        <StatCard label="Area managers" value={countOf('area_manager')} note="centers & byproduct sellers" />
        <StatCard label="Business buyers" value={countOf('business')} note="b2b" />
        <StatCard label="Admins" value={countOf('super_admin')} note="platform staff" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="input w-full sm:w-72" placeholder="Search name, email or phone"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          {roleFilters.map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider ${
                role === r ? 'border-forest bg-forest text-cream' : 'border-line text-muted hover:bg-white'}`}>
              {r === 'all' ? 'all' : roleLabel[r]}
            </button>
          ))}
        </div>
      </div>

      <Alert>{error}</Alert>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white/70">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-muted">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">Loading…</td></tr>}
            {!loading && shown.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">No users match.</td></tr>
            )}
            {!loading && shown.map((u) => {
              const isMe = u.id === me.id
              const isAdmin = u.role === 'super_admin'
              const canToggle = !isMe && ['active', 'suspended'].includes(u.status)
              return (
                <tr key={u.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-ink">{u.full_name}{isMe && <span className="ml-2 font-mono text-[10px] uppercase text-forest-2">you</span>}</p>
                    <p className="font-mono text-[11px] text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                  </td>
                  <td className="px-5 py-4">{roleLabel[u.role]}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${statusBadge[u.status]}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <div className={`flex justify-end gap-2 ${busy === u.id ? 'opacity-50 pointer-events-none' : ''}`}>
                      {!isMe && u.status === 'active' && (
                        isAdmin ? (
                          <button onClick={() => run(u.id, 'set_admin', { p_make_admin: false }, `Remove admin access from ${u.full_name}?`)}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-cream-2">Remove admin</button>
                        ) : (
                          <button onClick={() => run(u.id, 'set_admin', { p_make_admin: true }, `Give ${u.full_name} full admin access?`)}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-cream-2">Make admin</button>
                        )
                      )}
                      {canToggle && (u.status === 'active' ? (
                        <button onClick={() => run(u.id, 'set_user_status', { p_status: 'suspended' }, `Suspend ${u.full_name}?`)}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5">Suspend</button>
                      ) : (
                        <button onClick={() => run(u.id, 'set_user_status', { p_status: 'active' })}
                          className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-cream hover:bg-forest-2">Reactivate</button>
                      ))}
                      {['pending', 'rejected'].includes(u.status) && (
                        <span className="font-mono text-[11px] text-muted">via approvals</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
