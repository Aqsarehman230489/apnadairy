import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { homeFor, roleLabel } from '../../lib/roles'
import AuthShell from '../../components/AuthShell'
import Loader from '../../components/Loader'
import Badge from '../../components/Badge'
import DocumentUpload from '../../components/DocumentUpload'

const copy = {
  pending: ['Under review', 'Your account is waiting for approval by the ApnaDairy admin. You will get access as soon as it is verified.'],
  rejected: ['Application not approved', 'Your application was not approved. Please contact ApnaDairy support for details.'],
  suspended: ['Account suspended', 'Your account is currently suspended. Please contact ApnaDairy support.'],
}

export default function Pending() {
  const { session, profile, loading, signOut, refreshProfile } = useAuth()
  if (loading) return <Loader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Loader label="Setting up your account" />
  if (profile.status === 'active') return <Navigate to={homeFor(profile.role)} replace />

  const [title, body] = copy[profile.status] ?? copy.pending
  return (
    <AuthShell title={title} subtitle={`${profile.full_name}, ${roleLabel[profile.role].toLowerCase()} account`}>
      <div className="panel p-5">
        <Badge status={profile.status} />
        <p className="mt-3 text-[15px] leading-relaxed text-ink">{body}</p>
      </div>
      {profile.status === 'pending' && ['area_manager', 'business'].includes(profile.role) && (
        <div className="mt-4"><DocumentUpload profile={profile} /></div>
      )}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={refreshProfile} className="btn-primary">Check status</button>
        <button onClick={signOut} className="btn-secondary">Sign out</button>
      </div>
    </AuthShell>
  )
}
