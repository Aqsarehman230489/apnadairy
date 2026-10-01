import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // 1. track the auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) { setProfile(null); setLoading(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 2. load the profile (role + status) whenever the user changes
  const loadProfile = useCallback(async (userId) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, status')
      .eq('id', userId)
      .single()
    if (error) console.error(error)
    setProfile(data ?? null)
    setLoading(false)
  }, [])

  const userId = session?.user?.id
  useEffect(() => {
    if (userId) loadProfile(userId)
  }, [userId, loadProfile])

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, loading, signOut, refreshProfile: () => userId && loadProfile(userId) }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
