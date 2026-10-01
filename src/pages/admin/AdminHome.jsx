import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'

const count = async (table, filter = {}) => {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  Object.entries(filter).forEach(([k, v]) => { q = q.eq(k, v) })
  const { count } = await q
  return count ?? 0
}

export default function AdminHome() {
  const { profile } = useAuth()
  const [s, setS] = useState({})

  useEffect(() => {
    Promise.all([
      count('profiles'),
      count('area_managers', { verification_status: 'pending' }),
      count('business_profiles', { verification_status: 'pending' }),
      count('area_managers', { verification_status: 'active' }),
      count('business_profiles', { verification_status: 'active' }),
    ]).then(([users, pm, pb, am, bb]) => setS({ users, pending: pm + pb, am, bb }))
  }, [])

  return (
    <>
      <PageHeader eyebrow="platform control" title={`Welcome, ${profile.full_name.split(' ')[0]}`}>
        <Link to="/admin/approvals" className="btn-primary px-5 grid place-items-center">Review approvals</Link>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered users" value={s.users} note="all roles" />
        <StatCard label="Pending approvals" value={s.pending} note="managers + businesses" />
        <StatCard label="Active area managers" value={s.am} note="verified centers" />
        <StatCard label="Verified businesses" value={s.bb} note="b2b buyers" />
      </div>
    </>
  )
}
