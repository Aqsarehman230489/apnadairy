import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RECOVERY_KEY } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// opened a password-reset link: go to the new-password page, wherever the link landed
export default function RecoveryRedirect() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const nav = useNavigate()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const on = () => setTick((n) => n + 1)
    window.addEventListener('apnadairy-recovery', on)
    return () => window.removeEventListener('apnadairy-recovery', on)
  }, [])
  useEffect(() => {
    let flag = null
    try { flag = sessionStorage.getItem(RECOVERY_KEY) } catch { /* ignore */ }
    if (flag && session && pathname !== '/reset-password') nav('/reset-password', { replace: true })
  }, [session, pathname, tick, nav])
  return null
}
