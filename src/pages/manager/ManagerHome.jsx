import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'

export default function ManagerHome() {
  const { profile } = useAuth()
  const [center, setCenter] = useState(null)

  useEffect(() => {
    supabase.from('area_managers').select('*').eq('user_id', profile.id).single()
      .then(({ data }) => setCenter(data))
  }, [profile.id])

  return (
    <>
      <PageHeader eyebrow={center?.type === 'byproduct' ? 'byproduct seller' : 'collection center'} title={center?.center_name ?? '…'} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Milk collected today" value="0 L" note="milk collection module" />
        <StatCard label="Tests run today" value="0" note="iot module" />
        <StatCard label="Stock available" value="0 L" note="inventory" />
        <StatCard label="Open B2B requests" value="0" note="bidding module" />
      </div>
      <p className="mt-6 font-mono text-xs text-muted">{center?.city}{center?.address ? ` · ${center.address}` : ''}</p>
    </>
  )
}
