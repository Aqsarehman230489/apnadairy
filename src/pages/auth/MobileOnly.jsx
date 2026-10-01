import { useAuth } from '../../context/AuthContext'
import { roleLabel } from '../../lib/roles'
import AuthShell from '../../components/AuthShell'

export default function MobileOnly() {
  const { profile, signOut } = useAuth()
  return (
    <AuthShell title="Use the ApnaDairy app" subtitle={profile ? roleLabel[profile.role] + ' account' : ''}>
      <p className="text-sm leading-relaxed text-ink">
        Farmer and customer accounts are managed in the ApnaDairy mobile app. This web portal is for admins, area managers and business buyers.
      </p>
      <button onClick={signOut} className="btn-primary mt-6 w-full">Sign out</button>
    </AuthShell>
  )
}
