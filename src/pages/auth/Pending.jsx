import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { homeFor, roleLabel } from '../../lib/roles'
import AuthShell from '../../components/AuthShell'
import Loader from '../../components/Loader'

const copy = {
  pending: ['Under review', 'Your account is waiting for approval by the ApnaDairy admin. You will get access as soon as it is verified.'],
  rejected: ['Application not approved', 'Your application was not approved. Please contact ApnaDairy support for details.'],
  suspended: ['Account suspended', 'Your account is currently suspended. Please contact ApnaDairy support.'],
}

export default function Pending() {
  const { session, profile, loading, signOut, refreshProfile } = useAuth()
  if (loading) return <Loader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Loader label="setting up your account" />
  if (profile.status === 'active') return <Navigate to={homeFor(profile.role)} replace />

  const [title, body] = copy[profile.status] ?? copy.pending
  return (
    <AuthShell title={title} subtitle={`${profile.full_name} · ${roleLabel[profile.role]}`}>
      <div className="rounded-xl border border-line bg-white/60 p-5">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-amber">
          <span className="h-2 w-2 rounded-full bg-amber pulse-dot" /> status: {profile.status}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink">{body}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={refreshProfile} className="btn-primary">Check again</button>
        <button onClick={signOut} className="h-[46px] rounded-[10px] border border-line text-sm font-semibold hover:bg-cream-2">Sign out</button>
      </div>
    </AuthShell>
  )
}
