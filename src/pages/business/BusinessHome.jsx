import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'

export default function BusinessHome() {
  const { profile } = useAuth()
  const [biz, setBiz] = useState(null)

  useEffect(() => {
    supabase.from('business_profiles').select('*').eq('user_id', profile.id).single()
      .then(({ data }) => setBiz(data))
  }, [profile.id])

  return (
    <>
      <PageHeader eyebrow={biz?.business_type ?? 'business'} title={biz?.business_name ?? '…'} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Open requirements" value="0" note="bulk requirements" />
        <StatCard label="Bids received" value="0" note="from area managers" />
        <StatCard label="Active orders" value="0" note="bulk orders" />
      </div>
    </>
  )
}
